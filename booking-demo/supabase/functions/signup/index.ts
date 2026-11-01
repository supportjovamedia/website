import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { createSignupHandler } from './handler.mjs';

// Compatibility endpoint: business creation requires an already verified account.
// New owner signup uses native Auth email verification before this step.
Deno.serve(createSignupHandler({ createClient, env: (name: string) => Deno.env.get(name) }));
