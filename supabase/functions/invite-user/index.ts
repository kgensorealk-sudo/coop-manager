// Follow this setup to deploy:
// 1. npx supabase login
// 2. npx supabase link --project-ref <your-project-id>
// 3. npx supabase functions deploy invite-user

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Fix for TypeScript error in non-Deno environments
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: any) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize Supabase Client
    // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically available in Edge Runtime
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Parse Request Body safely
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const { email, full_name, role } = body

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Invite User (Sends Official Email via Supabase Auth)
    const { data: user, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name }
    })
    
    if (inviteError) {
      console.error("Invite Error:", inviteError)
      // Return 200 with error property so client can read the message instead of throwing
      return new Response(JSON.stringify({ error: inviteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, 
      })
    }

    // 4. Create Public Profile Record
    if (user?.user) {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('auth_id', user.user.id)
        .single()

      if (!existingProfile) {
        await supabaseAdmin.from('profiles').insert({
          auth_id: user.user.id,
          email: email,
          full_name: full_name,
          role: role || 'member',
          is_coop_member: true, // Auto-approve invited members
          equity: 0
        })
      }
    }

    return new Response(JSON.stringify({ message: "Invitation sent successfully" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    // Catch-all for unexpected runtime errors (e.g. env vars missing, network issues)
    console.error("Unexpected Edge Function Error:", error)
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})