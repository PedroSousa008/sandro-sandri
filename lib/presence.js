/* ========================================
   Real-time presence: online counts + visitor keys
   ======================================== */

/** Consider "online" if last ping within this window (must exceed client heartbeat + network slack). */
const ONLINE_THRESHOLD_MS = 36000;

/** Drop presence rows older than this on each write (keeps KV blob small). */
const PRUNE_STALE_ACTIVITY_MS = 120000;

/** Minimum seconds between full writes per browser tab (server-side). */
const SERVER_ACTIVITY_THROTTLE_SEC = 1.2;

/**
 * One key per human when logged in; one per browser session for guests.
 * @param {string|null|undefined} email
 * @param {string} sessionId
 * @returns {string|null}
 */
function buildVisitorPresenceKey(email, sessionId) {
    const sid = sessionId && String(sessionId).trim();
    if (!sid || sid.length > 220) return null;
    const e = email && String(email).trim().toLowerCase();
    if (e && e.includes('@') && e.length <= 320) return `user:${e}`;
    return `guest:${sid}`;
}

function normalizeSessionVisitorKey(session) {
    if (!session || typeof session !== 'object') return null;
    if (session.visitorKey && typeof session.visitorKey === 'string') return session.visitorKey;
    return buildVisitorPresenceKey(session.email, session.sessionId);
}

/**
 * Remove stale tab rows from activity blob (mutates activityData).
 * @param {Record<string, object>} activityData
 */
function pruneStaleActivityEntries(activityData) {
    if (!activityData || typeof activityData !== 'object') return;
    const now = Date.now();
    Object.keys(activityData).forEach((id) => {
        const session = activityData[id];
        if (!session || !session.lastActivity) {
            delete activityData[id];
            return;
        }
        const age = now - new Date(session.lastActivity).getTime();
        if (age > PRUNE_STALE_ACTIVITY_MS) {
            delete activityData[id];
        }
    });
}

/**
 * @param {Record<string, object>} activityData
 * @param {string} ownerEmailRaw
 */
function computeOnlineFromActivityData(activityData, ownerEmailRaw) {
    const owner = (ownerEmailRaw || '').toLowerCase().trim();
    const now = Date.now();
    const data = activityData && typeof activityData === 'object' ? activityData : {};

    const rawActive = Object.values(data).filter((s) => {
        if (!s || !s.lastActivity) return false;
        return now - new Date(s.lastActivity).getTime() <= ONLINE_THRESHOLD_MS;
    });

    const byVisitor = new Map();
    for (const s of rawActive) {
        const em = s.email ? String(s.email).toLowerCase().trim() : '';
        if (owner && em === owner) continue;
        const vk = normalizeSessionVisitorKey(s);
        if (!vk) continue;
        const prev = byVisitor.get(vk);
        if (!prev || new Date(s.lastActivity) > new Date(prev.lastActivity)) {
            byVisitor.set(vk, s);
        }
    }

    const checkoutUsersByChapter = {
        'chapter-1': 0,
        'chapter-2': 0,
        both: 0,
        unknown: 0
    };

    let checkoutUsers = 0;
    for (const session of byVisitor.values()) {
        if (session.isCheckout !== true) continue;
        checkoutUsers++;
        const chapters = session.chapters || [];
        if (chapters.length === 0) {
            checkoutUsersByChapter.unknown++;
        } else if (chapters.includes('chapter-1') && chapters.includes('chapter-2')) {
            checkoutUsersByChapter.both++;
        } else if (chapters.includes('chapter-1')) {
            checkoutUsersByChapter['chapter-1']++;
        } else if (chapters.includes('chapter-2')) {
            checkoutUsersByChapter['chapter-2']++;
        } else {
            checkoutUsersByChapter.unknown++;
        }
    }

    return {
        onlineUsers: byVisitor.size,
        checkoutUsers,
        checkoutUsersByChapter,
        activeSessions: Array.from(byVisitor.values()),
        rawActiveCount: rawActive.length,
        totalSessions: Object.keys(data).length
    };
}

module.exports = {
    ONLINE_THRESHOLD_MS,
    PRUNE_STALE_ACTIVITY_MS,
    SERVER_ACTIVITY_THROTTLE_SEC,
    buildVisitorPresenceKey,
    normalizeSessionVisitorKey,
    pruneStaleActivityEntries,
    computeOnlineFromActivityData
};
