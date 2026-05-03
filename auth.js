// ============ SUPABASE CONFIG ============
const SUPABASE_URL = 'https://tqukwfotmokeivzlhmsy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SrpGLdaA-3Q-MwYdaqo6wg_qKlBNwgN';

const supabaseGlobal = typeof supabase !== 'undefined' ? supabase : window.supabase;
const supabaseClient = supabaseGlobal.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============ AUTH FUNCTIONS ============
async function signup(username, password) {
  try {
    // Hash password on client (simple - in production use proper bcrypt)
    const passwordHash = await hashPassword(password);

    // Insert user
    const { data, error } = await supabaseClient
      .from('users')
      .insert([{ username, password_hash: passwordHash }])
      .select();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Username already exists' };
      }
      throw error;
    }

    // Store in localStorage
    localStorage.setItem('current_user', JSON.stringify({ 
      id: data[0].id, 
      username: username 
    }));

    return { success: true, user: data[0] };
  } catch (e) {
    console.error('Signup error:', e);
    return { success: false, error: e.message };
  }
}

async function login(username, password) {
  try {
    const passwordHash = await hashPassword(password);

    // Find user
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      return { success: false, error: 'User not found' };
    }

    // Check password
    if (data.password_hash !== passwordHash) {
      return { success: false, error: 'Invalid password' };
    }

    // Store in localStorage
    localStorage.setItem('current_user', JSON.stringify({ 
      id: data.id, 
      username: username 
    }));

    return { success: true, user: data };
  } catch (e) {
    console.error('Login error:', e);
    return { success: false, error: e.message };
  }
}

function logout() {
  localStorage.removeItem('current_user');
}

function getCurrentUser() {
  const stored = localStorage.getItem('current_user');
  return stored ? JSON.parse(stored) : null;
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

// Simple password hash (NOT for production - use proper bcrypt)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
