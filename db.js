// ============ RUNS FUNCTIONS ============

async function saveDynamisRun(runData) {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.warn('Not logged in - run not saved to database');
      return null;
    }

    const { data, error } = await supabaseClient
      .from('runs')
      .insert([{
        date: new Date().toISOString(),
        zone_name: runData.zoneName,
        default_members: runData.defaultMembers || [],
        guest_players: runData.guestPlayers || [],
        entry_fee_per_player: runData.feeEach,
        currency_data: runData.cData,
        leftover_results: runData.lotteryResults || null
      }])
      .select();

    if (error) throw error;

    // Update guest history
    if (runData.guestPlayers && runData.guestPlayers.length > 0) {
      await updateGuestHistory(runData.guestPlayers);
    }

    return data ? data[0] : null;
  } catch (e) {
    console.error('Error saving run:', e);
    return null;
  }
}

async function getRunHistory(limit = 100) {
  try {
    const user = getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabaseClient
      .from('runs')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error fetching runs:', e);
    return [];
  }
}

// ============ ANALYTICS ============

async function getAnalytics() {
  try {
    const user = getCurrentUser();
    if (!user) return null;

    const { data: runs, error } = await supabaseClient
      .from('runs')
      .select('*');

    if (error || !runs) return null;

    const BASE_FEE = 1000000;
    const stats = {
      totalRuns: runs.length,
      totalSales: 0,
      avgFeePerPlayer: 0,
      currencyByType: {},
      playerFrequency: {},
      dateRange: { start: null, end: null }
    };

    runs.forEach(run => {
      const numPlayers = (run.default_members?.length || 0) + (run.guest_players?.length || 0);
      if (numPlayers > 0 && typeof run.entry_fee_per_player === 'number') {
        const totalFeePaid = run.entry_fee_per_player * numPlayers;
        // Infer relic sales from how much the base fee was reduced.
        const salesIncome = Math.max(0, BASE_FEE - totalFeePaid);
        stats.totalSales += salesIncome;
      }

      // Avg fee
      stats.avgFeePerPlayer += run.entry_fee_per_player;

      // Currency breakdown
      if (run.currency_data && Array.isArray(run.currency_data)) {
        run.currency_data.forEach(c => {
          if (!stats.currencyByType[c.name]) {
            stats.currencyByType[c.name] = { total: 0, count: 0 };
          }
          stats.currencyByType[c.name].total += c.perP || 0;
          stats.currencyByType[c.name].count += 1;
        });
      }

      // Player frequency (both default + guests)
      const allPlayers = [
        ...(run.default_members || []),
        ...(run.guest_players || [])
      ];
      allPlayers.forEach(p => {
        stats.playerFrequency[p] = (stats.playerFrequency[p] || 0) + 1;
      });

      // Date range
      const runDate = new Date(run.date);
      if (!stats.dateRange.start || runDate < new Date(stats.dateRange.start)) {
        stats.dateRange.start = run.date;
      }
      if (!stats.dateRange.end || runDate > new Date(stats.dateRange.end)) {
        stats.dateRange.end = run.date;
      }
    });

    // Calculate averages
    if (runs.length > 0) {
      stats.avgFeePerPlayer = Math.round(stats.avgFeePerPlayer / runs.length);
    }

    // Avg currency per type
    Object.keys(stats.currencyByType).forEach(type => {
      const data = stats.currencyByType[type];
      data.avg = Math.round(data.total / data.count);
    });

    return stats;
  } catch (e) {
    console.error('Error fetching analytics:', e);
    return null;
  }
}

// ============ DEFAULT MEMBERS ============

const DEFAULT_MEMBERS_KEY = 'dynamis_default_members';

function loadLocalDefaultMembers() {
  try {
    return JSON.parse(localStorage.getItem(DEFAULT_MEMBERS_KEY) || '[]');
  } catch (e) {
    console.warn('Failed to parse local default members from localStorage:', e);
    return [];
  }
}

function saveLocalDefaultMembers(members) {
  try {
    localStorage.setItem(DEFAULT_MEMBERS_KEY, JSON.stringify(members));
  } catch (e) {
    console.warn('Failed to save local default members to localStorage:', e);
  }
}

async function getDefaultMembers() {
  const localMembers = loadLocalDefaultMembers();

  try {
    const { data, error } = await supabaseClient
      .from('default_members')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    const members = Array.isArray(data) ? data.map(m => ({ id: m.id, name: m.name })) : [];
    saveLocalDefaultMembers(members);
    return members;
  } catch (e) {
    console.error('Error fetching default members:', e);
    if (localMembers.length > 0) {
      console.warn('Using local default members fallback.');
      return localMembers;
    }
    return [];
  }
}

async function addDefaultMember(name) {
  try {
    const user = getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const { data, error } = await supabaseClient
      .from('default_members')
      .insert([{ name }])
      .select();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Member already exists' };
      }
      throw error;
    }

    const member = data[0];
    const localMembers = loadLocalDefaultMembers().filter(m => m.id !== member.id);
    saveLocalDefaultMembers([...localMembers, { id: member.id, name: member.name }]);

    return { success: true, member };
  } catch (e) {
    console.error('Error adding member:', e);
    return { success: false, error: e.message };
  }
}

async function deleteDefaultMember(memberId) {
  try {
    const user = getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const { error } = await supabaseClient
      .from('default_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;

    const localMembers = loadLocalDefaultMembers().filter(m => m.id !== memberId);
    saveLocalDefaultMembers(localMembers);

    return { success: true };
  } catch (e) {
    console.error('Error deleting member:', e);
    return { success: false, error: e.message };
  }
}

// ============ GUEST HISTORY ============

async function getGuestHistory() {
  try {
    const { data, error } = await supabaseClient
      .from('guest_history')
      .select('*')
      .order('last_appeared', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error fetching guest history:', e);
    return [];
  }
}

async function updateGuestHistory(guestNames) {
  try {
    for (const name of guestNames) {
      if (!name || !name.trim()) continue;

      // Check if guest exists
      const { data: existing } = await supabaseClient
        .from('guest_history')
        .select('*')
        .eq('name', name)
        .single();

      if (existing) {
        // Update count and last_appeared
        await supabaseClient
          .from('guest_history')
          .update({
            times_appeared: existing.times_appeared + 1,
            last_appeared: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Insert new guest
        await supabaseClient
          .from('guest_history')
          .insert([{ name, times_appeared: 1 }]);
      }
    }
  } catch (e) {
    console.error('Error updating guest history:', e);
  }
}
