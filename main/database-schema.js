(function () {
    const herbKeys = [
        'akapulko', 'ampalaya', 'bawang', 'bayabas', 'lagundi',
        'niyog_niyogan', 'sambong', 'tsaang_gubat', 'ulasimang_bato', 'yerba_buena'
    ];

    const generalAchievementKeys = [
        'hello_world', 'no_more_limits', 'serious_dedication',
        'good_neighbour', 'a_whole_new_world', 'master_herbalist',
        'becoming_an_apprentice', 'ohhh_kawaaiii', 'press_b_button',
        'brochure_expert'
    ];

    const herbAchievementKeys = herbKeys.map(key => `master_${key}`);
    const maxHerbMastery = 300;
    const maxReputation = 100;
    const avatarPaths = [
        'Chieftain_VillageElder.png',
        'Kael_MaleMC.png',
        'Lily_FemaleMC.png',
        'Lolo_Herbalist.png',
        'Researcher.png'
    ].map(filename => `../img/avatars/${filename}`);
    const defaultAvatarPath = '../img/avatars/Researcher.png';

    function boundedInteger(value, fallback, minimum, maximum) {
        if (value === undefined || value === null || value === '') return fallback;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return fallback;
        return Math.min(maximum, Math.max(minimum, Math.trunc(parsed)));
    }

    function createHerbMastery(source = {}) {
        return Object.fromEntries(herbKeys.map(key => {
            const state = source[key] ?? (key === 'ulasimang_bato' ? source.ulamisang_bato : undefined);
            let mastery;

            if (typeof state === 'object' && state !== null) {
                mastery = boundedInteger(
                    state.mastery,
                    state.mastered === true ? maxHerbMastery : state.discovered === true ? 1 : 0,
                    0,
                    maxHerbMastery
                );
            } else {
                mastery = state === true ? maxHerbMastery : boundedInteger(state, 0, 0, maxHerbMastery);
            }

            return [key, { mastery, mastered: state?.mastered === true || mastery >= maxHerbMastery }];
        }));
    }

    function createAchievementMap(source = {}, keys, defaults = {}) {
        return Object.fromEntries(keys.map(key => [
            key,
            typeof source[key] === 'boolean' ? source[key] : defaults[key] === true
        ]));
    }

    function withoutStarterHerbCounts(herbs = {}) {
        const inventoryHerbs = { ...herbs };
        delete inventoryHerbs.garlic_unknown;
        delete inventoryHerbs.garlic;
        return inventoryHerbs;
    }

    function normalizeGender(gender) {
        return ['male', 'female'].includes(gender) ? gender : 'N/A';
    }

    function normalizeAvatar(avatarPath) {
        return avatarPaths.includes(avatarPath) ? avatarPath : defaultAvatarPath;
    }

    function createDefaultSave(gender, previous = {}) {
        const inventory = previous.inventory || {};
        const achievementSource = previous.achievements || {};

        return {
            gender: normalizeGender(previous.gender ?? gender),
            aurels: boundedInteger(previous.aurels, 0, 0, 9999),
            reputation: boundedInteger(previous.reputation, 0, 0, maxReputation),
            chapter: boundedInteger(previous.chapter ?? previous.level, 1, 1, 3),
            day: boundedInteger(previous.day, 1, 1, 60),
            inventory: {
                Items: { ...(inventory.items || {}), ...(inventory.Items || {}) },
                Herbs: withoutStarterHerbCounts({ ...(inventory.herbs || {}), ...(inventory.Herbs || {}) })
            },
            herbsMastered: createHerbMastery(previous.herbsMastered || {}),
            achievements: {
                general: createAchievementMap(
                    achievementSource.general || {},
                    generalAchievementKeys,
                    { no_more_limits: previous.isPremium === true }
                ),
                herbs: createAchievementMap(achievementSource.herbs || {}, herbAchievementKeys)
            }
        };
    }

    function createDefaultProfile(user, username, gender = 'N/A') {
        const saveGender = normalizeGender(gender);
        return {
            username: username || user.email?.split('@')[0] || user.displayName || 'Herbalist',
            email: user.email || '',
            photoURL: defaultAvatarPath,
            isPremium: false,
            saves: {
                slot1: createDefaultSave(saveGender),
                slot2: createDefaultSave(saveGender),
                slot3: createDefaultSave(saveGender)
            }
        };
    }

    async function migrateUser(userRef, authUser) {
        const snapshot = await userRef.once('value');
        const profile = snapshot.val() || {};
        const saves = profile.saves || {};
        const legacyGender = normalizeGender(profile.gender);
        const updates = {};

        if (profile.username === undefined) {
            updates.username = authUser.email?.split('@')[0] || authUser.displayName || 'Herbalist';
        }
        if (profile.email === undefined) updates.email = authUser.email || '';
        const avatarPath = normalizeAvatar(profile.photoURL);
        if (profile.photoURL !== avatarPath) updates.photoURL = avatarPath;
        if (profile.isPremium === undefined) updates.isPremium = false;
        if (profile.friends !== undefined) updates.friends = null;
        if (profile.friend_request !== undefined) updates.friend_request = null;

        for (const slotName of ['slot1', 'slot2', 'slot3']) {
            const slot = saves[slotName];
            const previousSave = slot || {};
            const legacyValues = slot || (slotName === 'slot1' ? profile : {});
            const migratedSave = {
                ...previousSave,
                ...createDefaultSave(previousSave.gender || legacyGender, legacyValues)
            };
            delete migratedSave.level;
            updates[`saves/${slotName}`] = migratedSave;
        }

        for (const legacyField of ['gender', 'aurels', 'herbsMastered', 'level']) {
            if (profile[legacyField] !== undefined) updates[legacyField] = null;
        }

        if (Object.keys(updates).length) await userRef.update(updates);
    }

    window.HerbaryoSchema = {
        herbKeys,
        maxHerbMastery,
        maxReputation,
        avatarPaths,
        defaultAvatarPath,
        normalizeAvatar,
        createDefaultProfile,
        createDefaultSave,
        createHerbMastery,
        migrateUser
    };
})();