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
        user_id: user.id,
        date: new Date().toISOString(),
        zone_name: runData.zoneName,
        default_members: runData.defaultMembers || [],
        guest_players: runData.guestPlayers || [],
        entry_fee_per_player: runData.feeEach,
        relic_sales: runData.relicSales || 0,
        currency_data: runData.cData,
        leftover_results: runData.lotteryResults
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

async function getRunHistory() {
  try {

    const { data, error } = await supabaseClient
      .from('runs')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error fetching runs:', e);
    return [];
  }
}

async function deleteRunFromDB(runId) {
  try {
    const user = getCurrentUser();
    if (!user) return false;

    const { error } = await supabaseClient
      .from('runs')
      .delete()
      .eq('id', runId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Error deleting run:', e);
    return false;
  }
}

// ============ ANALYTICS ============

async function getAnalytics() {
  try {

    const { data: runs, error } = await supabaseClient
      .from('runs')
      .select('*');

    if (error || !runs) return null;

    const stats = {
      totalRuns: runs.length,
      totalSales: 0,
      avgFeePerPlayer: 0,
      currencyByType: {},
      playerFrequency: {},
      total100PieceDrops: 0,
      dateRange: { start: null, end: null }
    };

runs.forEach(run => {
      // Add relic sales directly
      stats.totalSales += (run.relic_sales || 0);

      // Avg fee
      stats.avgFeePerPlayer += run.entry_fee_per_player;

      // Count 100-piece drops by actual hundreds input or total value
      if (run.currency_data && Array.isArray(run.currency_data)) {
        run.currency_data.forEach(c => {
          const hundreds = typeof c.hundreds === 'number'
            ? c.hundreds
            : typeof c.total === 'number'
              ? Math.floor(c.total / 100)
              : 0;
          stats.total100PieceDrops += hundreds;
        });
      }

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
      .insert([{ user_id: user.id, name }])
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
      .eq('id', memberId)
      .eq('user_id', user.id);

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
    const user = getCurrentUser();
    const names = guestNames.filter(n => n?.trim());
    if (names.length === 0) return;

    const now = new Date().toISOString();

    // Fetch all matching rows in one query
    const { data: existing } = await supabaseClient
      .from('guest_history')
      .select('id, name, times_appeared')
      .in('name', names);

    const existingMap = Object.fromEntries((existing || []).map(r => [r.name, r]));
    const toUpdate = names.filter(n => existingMap[n]);
    const toInsert = names.filter(n => !existingMap[n]);

    const ops = [];
    if (toUpdate.length > 0) {
      ops.push(...toUpdate.map(n =>
        supabaseClient
          .from('guest_history')
          .update({ times_appeared: existingMap[n].times_appeared + 1, last_appeared: now })
          .eq('id', existingMap[n].id)
      ));
    }
    if (toInsert.length > 0) {
      ops.push(
        supabaseClient
          .from('guest_history')
          .insert(toInsert.map(n => ({ user_id: user?.id, name: n, times_appeared: 1, last_appeared: now })))
      );
    }

    await Promise.all(ops);
  } catch (e) {
    console.error('Error updating guest history:', e);
  }
}
