// ============ SUPABASE CONFIG ============
const SUPABASE_URL = 'https://tqukwfotmokeivzlhmsy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SrpGLdaA-3Q-MwYdaqo6wg_qKlBNwgN';

const supabaseGlobal = typeof supabase !== 'undefined' ? supabase : window.supabase;
const supabaseClient = supabaseGlobal.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============ SESSION STATE ============
let _currentUser = null;

// Resolves once the initial session is known — await _authReady before calling isLoggedIn()
const _authReady = (async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  _currentUser = session?.user ?? null;

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    _currentUser = session?.user ?? null;
  });
})();

function getCurrentUser() { return _currentUser; }
function isLoggedIn()     { return _currentUser !== null; }

// ============ AUTH FUNCTIONS ============
const AUTH_DOMAIN = '@dynamissplit.com';
const toEmail = username => username.toLowerCase().trim() + AUTH_DOMAIN;

async function signup(username, password) {
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: toEmail(username),
      password,
      options: { data: { username } }
    });
    if (error) return { success: false, error: error.message };
    _currentUser = data.user;
    return { success: true, user: data.user };
  } catch (e) {
    console.error('Signup error:', e);
    return { success: false, error: e.message };
  }
}

async function login(username, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: toEmail(username),
      password
    });
    if (error) return { success: false, error: error.message };
    _currentUser = data.user;
    return { success: true, user: data.user };
  } catch (e) {
    console.error('Login error:', e);
    return { success: false, error: e.message };
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  _currentUser = null;
}
