const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. HELPER TO LOAD ENVIRONMENT VARIABLES MANUALLY
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  const env = { ...process.env };

  for (const file of envFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`Reading credentials from ${file}...`);
      const content = fs.readFileSync(filePath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          let value = match[2] ? match[2].trim() : '';
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          env[match[1]] = value;
        }
      });
      break; // Stop at the first file found (.env.local has higher priority)
    }
  }

  return env;
}

async function seed() {
  console.log('--------------------------------------------------');
  console.log('🚀 Starting NEET Analyzer Database User Seeder');
  console.log('--------------------------------------------------');

  const env = loadEnv();

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  // Look for service role key to bypass email confirmation
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL is not defined in environment files.');
    process.exit(1);
  }

  const activeKey = serviceKey || anonKey;
  if (!activeKey) {
    console.error('❌ Error: No Supabase API keys found (Anon key or Service role key required).');
    process.exit(1);
  }

  const isUsingAdminPrivileges = !!serviceKey;
  console.log(`Connected to: ${supabaseUrl}`);
  console.log(`Client Mode: ${isUsingAdminPrivileges ? 'SUPABASE ADMIN (Bypasses email verification)' : 'CLIENT PUBLIC'}`);

  // Create client
  const supabase = createClient(supabaseUrl, activeKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // User Accounts to Provision
  const usersToCreate = [
    {
      email: 'admin@gmail.com',
      password: 'Hello@1234',
      fullName: 'Admin Instructor',
      isAdmin: true
    },
    {
      email: 'gauri@neet.com',
      password: 'Hello@1234',
      fullName: 'Gauri Student',
      isAdmin: false
    }
  ];

  for (const targetUser of usersToCreate) {
    console.log(`\nProcessing account: ${targetUser.email}...`);
    let authUser = null;

    try {
      if (isUsingAdminPrivileges) {
        // --- ADMIN SEED FLOW (Service Role - Instant & verified) ---
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email: targetUser.email,
          password: targetUser.password,
          email_confirm: true, // AUTO-CONFIRM
          user_metadata: {
            full_name: targetUser.fullName,
            is_admin: targetUser.isAdmin
          }
        });

        if (createError) {
          // If user already exists, let's catch it and try to fetch/update instead
          if (createError.message.includes('already registered') || createError.message.includes('already exists')) {
            console.log(`💡 Account already exists in Auth. Synchronizing profile database permissions...`);
            
            // Try to find user id by selecting from profiles
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', targetUser.email.toLowerCase())
              .single();

            if (profile) {
              authUser = { id: profile.id };
            }
          } else {
            throw createError;
          }
        } else {
          authUser = createData.user;
          console.log(`✅ Created Auth Account successfully (ID: ${authUser.id})`);
        }
      } else {
        // --- CLIENT SEED FLOW (Anon key - subject to verification console settings) ---
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: targetUser.email,
          password: targetUser.password,
          options: {
            data: {
              full_name: targetUser.fullName,
              is_admin: targetUser.isAdmin
            }
          }
        });

        if (signupError) {
          if (signupError.message.includes('already registered') || signupError.message.includes('already exists')) {
            console.log(`💡 Account already registered. Synchronizing profiles table permissions...`);
            
            // Look up existing user profile ID
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', targetUser.email.toLowerCase())
              .single();

            if (profile) {
              authUser = { id: profile.id };
            }
          } else {
            throw signupError;
          }
        } else {
          authUser = signupData.user;
          console.log(`✅ Registration request submitted. (ID: ${authUser?.id})`);
          if (signupData.session === null) {
            console.log(`⚠️ Note: Check email console to confirm verification link, or log in.`);
          }
        }
      }

      // --- 2. ENSURE PROFILE TABLE RECORD MATCHES ---
      if (authUser) {
        console.log(`Synchronizing profile record: [is_admin = ${targetUser.isAdmin}]...`);

        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (existingProfile) {
          // Update profile permissions explicitly
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              is_admin: targetUser.isAdmin,
              full_name: targetUser.fullName
            })
            .eq('id', authUser.id);

          if (updateError) throw updateError;
          console.log(`✅ Updated existing profile record successfully!`);
        } else {
          // Insert profile record explicitly
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: authUser.id,
              email: targetUser.email.toLowerCase(),
              full_name: targetUser.fullName,
              is_admin: targetUser.isAdmin
            });

          if (insertError) throw insertError;
          console.log(`✅ Created profile record successfully!`);
        }
      } else {
        console.warn(`⚠️ Warning: Could not resolve Auth user ID for synchronization.`);
      }

    } catch (err) {
      console.error(`❌ Error provisioning ${targetUser.email}:`, err.message);
    }
  }

  console.log('\n--------------------------------------------------');
  console.log('🎉 Seeding operations completed!');
  console.log('You can now log in using these accounts.');
  console.log('--------------------------------------------------');
}

seed();
