(function () {
    const herbKeys = [
        'akapulko', 'ampalaya', 'bawang', 'bayabas', 'lagundi',
        'niyog_niyogan', 'sambong', 'tsaang_gubat', 'ulasimang_bato', 'yerba_buena'
    ];

    const generalAchievementKeys = [
        'hello_world', 'no_more_limits', 'serious_dedication',
        'good_neighbour', 'a_whole_new_world', 'master_herbalist'
    ];

    const herbAchievementKeys = herbKeys.map(key => `master_${key}`);

    function numericValue(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function createHerbMastery(source = {}) {
        return Object.fromEntries(herbKeys.map(key => {
            const state = source[key] ?? (key === 'ulasimang_bato' ? source.ulamisang_bato : undefined);
            const discovered = typeof state === 'object' && state !== null
                ? state.discovered === true
                : state === true;
            const mastered = typeof state === 'object' && state !== null
                ? state.mastered === true
                : state === true;
            return [key, { discovered: discovered || mastered, mastered }];
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

    function createDefaultSave(gender = 'male', previous = {}) {
        const inventory = previous.inventory || {};
        const achievementSource = previous.achievements || {};

        return {
            gender: gender === 'female' ? 'female' : 'male',
            aurels: numericValue(previous.aurels, 0),
            reputation: numericValue(previous.reputation, 0),
            level: numericValue(previous.level, 1),
            day: numericValue(previous.day, 1),
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

    function createDefaultProfile(user, username, gender) {
        const saveGender = gender === 'female' ? 'female' : 'male';
        return {
            username: username || user.displayName || 'Herbalist',
            email: user.email || '',
            photoURL: user.photoURL || '',
            isPremium: false,
            friends: {},
            friend_request: {},
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
        const legacyGender = profile.gender === 'female' ? 'female' : 'male';
        const updates = {};

        if (profile.username === undefined) {
            updates.username = authUser.displayName || 'Herbalist';
        }
        if (profile.email === undefined) updates.email = authUser.email || '';
        if (profile.photoURL === undefined) updates.photoURL = authUser.photoURL || '';
        if (profile.isPremium === undefined) updates.isPremium = false;
        if (profile.friends === undefined) updates.friends = {};
        if (profile.friend_request === undefined) updates.friend_request = {};

        for (const slotName of ['slot1', 'slot2', 'slot3']) {
            const slot = saves[slotName];
            const previousSave = slot || {};
            const legacyValues = slot || (slotName === 'slot1' ? profile : {});
            updates[`saves/${slotName}`] = {
                ...previousSave,
                ...createDefaultSave(previousSave.gender || legacyGender, legacyValues)
            };
        }

        for (const legacyField of ['gender', 'aurels', 'herbsMastered']) {
            if (profile[legacyField] !== undefined) updates[legacyField] = null;
        }

        if (Object.keys(updates).length) await userRef.update(updates);
    }

    window.HerbaryoSchema = {
        herbKeys,
        createDefaultProfile,
        createDefaultSave,
        createHerbMastery,
        migrateUser
    };
})();