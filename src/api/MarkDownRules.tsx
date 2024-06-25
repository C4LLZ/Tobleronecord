/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";


const logger = new Logger("MarkDownRules");

export interface Rule {
    match: (...a: any) => RegExpExecArray;
    parse: (...a: any) => any;
    order: number;
    requiredFirstCharacters: Array<string>;
    [k: string]: any;
}

export interface Rules {
    [k: string]: any;
}

export interface MarkDownRules {
    RULES: Rules;
    CHANNEL_TOPIC_RULES: Rules;
    VOICE_CHANNEL_STATUS_RULES: Rules;
    EMBED_TITLE_RULES: Rules;
    INLINE_REPLY_RULES: Rules;
    GUILD_VERIFICATION_FORM_RULES: Rules;
    GUILD_EVENT_RULES: Rules;
    PROFILE_BIO_RULES: Rules;
    AUTO_MODERATION_SYSTEM_MESSAGE_RULES: Rules;
    NATIVE_SEARCH_RESULT_LINK_RULES: Rules;
}

export interface PluginMarkDownRules {
    RULES?: Rules;
    CHANNEL_TOPIC_RULES?: Rules;
    VOICE_CHANNEL_STATUS_RULES?: Rules;
    EMBED_TITLE_RULES?: Rules;
    INLINE_REPLY_RULES?: Rules;
    GUILD_VERIFICATION_FORM_RULES?: Rules;
    GUILD_EVENT_RULES?: Rules;
    PROFILE_BIO_RULES?: Rules;
    AUTO_MODERATION_SYSTEM_MESSAGE_RULES?: Rules;
    NATIVE_SEARCH_RESULT_LINK_RULES?: Rules;
}

export const Rules: MarkDownRules = {} as MarkDownRules;
export const PendingRules: Array<(r: MarkDownRules) => MarkDownRules | PluginMarkDownRules> = [];

export function AddAPendingRule(rules: (r: MarkDownRules) => MarkDownRules | PluginMarkDownRules) {
    logger.debug("Adding pending rule", rules);
    PendingRules.push(rules);
}

export function RemoveAPendingRule(rules: (r: MarkDownRules) => MarkDownRules | PluginMarkDownRules) {
    if (PendingRules.indexOf(rules) === -1) return;
    delete PendingRules[PendingRules.indexOf(rules)];
}

export function patchMarkdownRules(originalRules: MarkDownRules) {
    function assignEntries(target: any, source: any) {
        for (const [k, v] of Object.entries(source)) {
            target[k] = Object.assign(target[k] ?? {}, v);
        }
    }
    for (const [key, rule] of Object.entries(PendingRules)) {
        const rules = rule(originalRules);
        assignEntries(Rules, rules);
        delete PendingRules[key];
        console.log("adding rules:", rules);
    }
    assignEntries(originalRules, Rules);
    // console.log("Added markdown rules", Ruler);
    // Ruler.PROFILE_BIO_RULES.codeBlock = Ruler.RULES.codeBlock;
    // Ruler.PROFILE_BIO_RULES.codeBlock = Ruler.RULES.codeBlock;
    console.log("Added markdown rules", Rules);
    return originalRules;
}
