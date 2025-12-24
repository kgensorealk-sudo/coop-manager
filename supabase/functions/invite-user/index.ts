// --- SETUP INSTRUCTIONS ---
// 1. Install Supabase CLI locally (Windows/Mac/Linux):
//    npm install -D supabase
//
// 2. Login to Supabase:
//    npx supabase login
//
// 3. Link your project:
//    npx supabase link --project-ref ygnxgcqnfwcecrtjqwnb
//    (Enter your database password when prompted)
//
// 4. Deploy this function:
//    npx supabase functions deploy invite-user
// --------------------------

// FILE: supabase/functions/invite-user/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, full_name, role } = await req.json()
    
    // Initialize Admin Client (Service Role)
    // The SUPABASE_SERVICE_ROLE_KEY is injected automatically in the Edge Runtime
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Invite User (Sends Official Email)
    const { data: user, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name }
    })
    
    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 2. Create Public Profile
    if (user.user) {
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('auth_id', user.user.id)
        .single()
      
      if (!existing) {
        const { error: profileError } = await supabaseAdmin.from('profiles').insert({
            auth_id: user.user.id,
            email,
            full_name,
            role: role || 'member',
            is_coop_member: true,
            equity: 0
        })
        if (profileError) console.error(profileError)
      }
    }

    return new Response(JSON.stringify({ message: "Invitation sent successfully" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
