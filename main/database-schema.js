(function () {
    const generalAchievementKeys = [
        'a_whole_new_world',
        'becoming_an_apprentice',
        'brochure_expert',
        'good_neighbour',
        'hello_world',
        'master_herbalist',
        'no_more_limits',
        'ohhh_kawaiii',
        'press_b_button',
        'serious_dedication',
        'we_need_to_cook'
    ];
    const avatarPaths = [
        'Chieftain_VillageElder.png',
        'Kael_MaleMC.png',
        'Lily_FemaleMC.png',
        'Lolo_Herbalist.png',
        'Researcher.png'
    ].map(filename => `../img/avatars/${filename}`);
    const defaultAvatarPath = '../img/avatars/Researcher.png';
    const profileColors = [
        { value: '#8DC46E', label: 'Fresh Leaf Green' },
        { value: '#D9A24C', label: 'Golden Mustard' },
        { value: '#739ECC', label: 'Dusty Blue' },
        { value: '#C7738C', label: 'Dusty Rose' },
        { value: '#CC784C', label: 'Burnt Orange' },
        { value: '#9478B8', label: 'Muted Lavender' }
    ];
    const defaultProfileColor = profileColors[0].value;

    function normalizeAvatar(avatarPath) {
        return avatarPaths.includes(avatarPath) ? avatarPath : defaultAvatarPath;
    }

    function normalizeColor(color) {
        return profileColors.find(option =>
            option.value.toLowerCase() === String(color).toLowerCase()
        )?.value || defaultProfileColor;
    }

    function createAchievementMap(source = {}) {
        const achievements = Object.fromEntries(generalAchievementKeys.map(key => [
            key,
            source[key] === true
        ]));
        if (source.ohhh_kawaiii === true || source.ohhh_kawaaiii === true) {
            achievements.ohhh_kawaiii = true;
        }
        return achievements;
    }

    function getLegacyAchievementSources(profile) {
        const sources = [];
        const profileAchievements = profile.achievements || {};
        sources.push(profileAchievements.general || profileAchievements);

        for (const save of Object.values(profile.saves || {})) {
            if (save && typeof save === 'object') {
                sources.push(save.achievements?.general || {});
            }
        }

        if (profile.saveData?.achievements?.general) {
            sources.push(profile.saveData.achievements.general);
        }
        return sources;
    }

    function createDefaultProfile(user, username) {
        return {
            email: user.email || '',
            account_type: 'free',
            photoURL: defaultAvatarPath,
            color: defaultProfileColor,
            username: username || user.email?.split('@')[0] || user.displayName || 'Herbalist',
            achievements: createAchievementMap()
        };
    }

    async function migrateUser(userRef, authUser = {}) {
        const snapshot = await userRef.once('value');
        const profile = snapshot.val() || {};
        const achievementSources = getLegacyAchievementSources(profile);
        const achievements = Object.fromEntries(generalAchievementKeys.map(key => [
            key,
            achievementSources.some(source =>
                source[key] === true
                || (key === 'ohhh_kawaiii' && (source.ohhh_kawaiii === true || source.ohhh_kawaaiii === true))
            )
            || (key === 'no_more_limits' && (profile.account_type === 'premium' || profile.isPremium === true))
        ]));
        const accountType = profile.account_type === 'premium' || profile.account_type === 'free'
            ? profile.account_type
            : profile.isPremium === true ? 'premium' : 'free';
        const username = profile.username
            || authUser.email?.split('@')[0]
            || authUser.displayName
            || 'Herbalist';
        const updates = {
            email: profile.email || authUser.email || '',
            account_type: accountType,
            photoURL: normalizeAvatar(profile.photoURL),
            color: normalizeColor(profile.color),
            username,
            achievements
        };

        const accountFields = new Set(['email', 'account_type', 'photoURL', 'color', 'username', 'achievements']);
        for (const existingField of Object.keys(profile)) {
            if (!accountFields.has(existingField)) updates[existingField] = null;
        }
        await userRef.update(updates);
        return { ...updates };
    }

    window.HerbaryoSchema = {
        generalAchievementKeys,
        avatarPaths,
        defaultAvatarPath,
        normalizeAvatar,
        profileColors,
        defaultProfileColor,
        normalizeColor,
        createAchievementMap,
        createDefaultProfile,
        migrateUser
    };
})();