/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { OptionType } from "@utils/types";
import { ApplicationAssetUtils, FluxDispatcher, Alerts, Forms } from "@webpack/common";
import { Margins } from "@utils/margins";
import { UserStore } from "@webpack/common";
import { Message } from "discord-types/general";
import { PluginNative } from "@utils/types";

export async function getApplicationAsset(key: string): Promise<string> {
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\/attachments\//.test(key)) return "mp:" + key.replace(/https?:\/\/(cdn|media)\.discordapp\.(com|net)\//, "");
    return (await ApplicationAssetUtils.fetchAssetIds("0", [key]))[0];
}


const settings = definePluginSettings({
    assetURL: {
        type: OptionType.STRING,
        description: "The image to use for your rpc. Your profile picture is used if left blank",
        default: "",
        restartNeeded: false,
        onChange: () => { updateData(); }
    },
    RPCTitle: {
        type: OptionType.STRING,
        description: "The title for the rpc",
        default: "RPCStats",
        restartNeeded: false,
        onChange: () => { updateData(); }
    },
    messagesSentToday: {
        type: OptionType.BOOLEAN,
        description: "Display the amount of messages sent today",
        default: true,
        restartNeeded: false,
        onChange: () => { validateSelection('messagesSentToday'); updateData(); }
    },
    messagesSentAllTime: {
        type: OptionType.BOOLEAN,
        description: "Display the amount of messages sent all time",
        default: false,
        restartNeeded: false,
        onChange: () => { validateSelection('messagesSentAllTime'); updateData(); }
    },
    mostListenedAlbum: {
        type: OptionType.BOOLEAN,
        description: "Display your most listened album for the week",
        default: false,
        restartNeeded: false,
        onChange: () => { validateSelection('mostListenedAlbum'); updateData(); }
    },
    notificationsReceived: {
        type: OptionType.BOOLEAN,
        description: "Display notifications received today",
        default: false,
        restartNeeded: false,
        onChange: () => { validateSelection('notificationsReceived'); updateData(); }
    },
    hoursOnline: {
        type: OptionType.BOOLEAN,
        description: "Display hours online today",
        default: false,
        restartNeeded: false,
        onChange: () => { validateSelection('hoursOnline'); updateData(); }
    },
    lastFMApiKey: {
        type: OptionType.STRING,
        description: "Your last.fm API key",
        default: "",
        restartNeeded: false,
        onChange: () => { updateData(); }
    },
    lastFMUsername: {
        type: OptionType.STRING,
        description: "Your last.fm username",
        default: "",
        restartNeeded: false,
        onChange: () => { updateData(); }
    },
    albumCoverImage: {
        type: OptionType.BOOLEAN,
        description: "Should the album cover image be used as the rpc image? (if you have the last fm display chosen)",
        default: true,
        restartNeeded: false,
        onChange: () => { updateData(); }
    },
    lastFMStatFormat: {
        type: OptionType.STRING,
        description: "How should the last fm stat be formatted? $album is replaced with the album name, and $artist is replaced with the artist name",
        default: "Top album this week: \"$album - $artist\"",
        restartNeeded: false,
        onChange: () => { updateData(); }
    }
});



function validateSelection(optionChanged: keyof typeof settings.store) {
    const selectedCount = [
        settings.store.messagesSentToday,
        settings.store.messagesSentAllTime,
        settings.store.mostListenedAlbum,
        settings.store.notificationsReceived,
        settings.store.hoursOnline
    ].filter(Boolean).length;

    if (selectedCount > 2) {
        settings.store[optionChanged] = false; // Deselect the last selected option
        Alerts.show({
            title: "Hold on!",
            body: <div>
                <Forms.FormText>Only two stats can be selected at once!</Forms.FormText>
                <Forms.FormText className={Margins.top8}>
                    Please deselect some options to proceed.
                </Forms.FormText>
            </div>
        });
        return false;
    }

    return true;
}


async function setRpc(disable?: boolean, details?: string, state?: string, imageURL?: string) {
    if (!disable) {
        if (!settings.store.lastFMApiKey.length && settings.store.mostListenedAlbum) {
            FluxDispatcher.dispatch({
                type: "LOCAL_ACTIVITY_UPDATE",
                activity: null,
                socketId: "RPCStats",
            });
        }
    }
    const activity = {
        "application_id": "0",
        "name": settings.store.RPCTitle,
        "details": details || "No info right now :(",
        "state": state || "",
        "type": 0,
        "flags": 1,
        "assets": {
            "large_image":
                (imageURL == null || !settings.store.albumCoverImage) ?
                    await getApplicationAsset(settings.store.assetURL.length ? settings.store.assetURL : UserStore.getCurrentUser().getAvatarURL()) :
                    await getApplicationAsset(imageURL)
        }
    };
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: !disable ? activity : null,
        socketId: "RPCStats",
    });
}

function getCurrentDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

const Native = VencordNative.pluginHelpers.RPCStats as PluginNative<typeof import("./native")>;

async function updateData() {
    let details = "";
    let state = "";

    if (settings.store.messagesSentToday) {
        let messagesSent;
        if (await DataStore.get("RPCStatsDate") == getCurrentDate()) {
            messagesSent = await DataStore.get("RPCStatsMessages");
        } else {
            await DataStore.set("RPCStatsDate", getCurrentDate());
            await DataStore.set("RPCStatsMessages", 0);
            messagesSent = 0;
        }
        details += `Messages sent today: ${messagesSent}`;
    }

    if (settings.store.messagesSentAllTime) {
        let messagesAllTime = await DataStore.get("RPCStatsAllTimeMessages");
        if (!messagesAllTime) {
            DataStore.set("RPCStatsAllTimeMessages", 0);
            messagesAllTime = 0;
        }
        if (details) details += " | ";
        details += `Messages sent all time: ${messagesAllTime}`;
    }

    if (settings.store.mostListenedAlbum) {
        let lastFMDataJson = await Native.fetchTopAlbum({
            apiKey: settings.store.lastFMApiKey,
            user: settings.store.lastFMUsername,
            period: "7day"
        });

        if (lastFMDataJson != null) {
            let lastFMData = JSON.parse(lastFMDataJson);
            if (details) details += " | ";
            details += settings.store.lastFMStatFormat.replace("$album", lastFMData.albumName).replace("$artist", lastFMData.artistName);
        }
    }

    if (settings.store.notificationsReceived) {
        let notificationsReceived = await DataStore.get("RPCStatsNotifications") || 0;
        if (state) state += " | ";
        state += `Notifications received today: ${notificationsReceived}`;
    }

    if (settings.store.hoursOnline) {
        let startTime = await DataStore.get("RPCStatsStartTime");
        if (!startTime) {
            startTime = Date.now();
            await DataStore.set("RPCStatsStartTime", startTime);
        }
        const hoursOnline = ((Date.now() - startTime) / 3600000).toFixed(2);
        if (state) state += " | ";
        state += `Hours online today: ${hoursOnline}`;
    }

    setRpc(false, details.trim(), state.trim());
}



export default definePlugin({
    name: "RPCStats",
    description: "Displays stats about your activity as an rpc",
    authors: [Devs.Samwich],
    async start() {
        await DataStore.set("RPCStatsStartTime", Date.now());
        updateData();

        setInterval(() => {
            checkForNewDay();
            updateData();
        }, 1000);

    },
    settings,
    stop() {
        setRpc(true);
    },
    flux: {
        async MESSAGE_CREATE({ optimistic, type, message }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (message.author.id != UserStore.getCurrentUser().id) return;
            await DataStore.set("RPCStatsMessages", await DataStore.get("RPCStatsMessages") + 1);
            await DataStore.set("RPCStatsAllTimeMessages", await DataStore.get("RPCStatsAllTimeMessages") + 1);
            updateData();
        },
        async NOTIFICATION_CREATE() {
            let notifications = await DataStore.get("RPCStatsNotifications") || 0;
            await DataStore.set("RPCStatsNotifications", notifications + 1);
            updateData();
        }
    }
});

let lastCheckedDate: string = getCurrentDate();

function checkForNewDay(): void {
    const currentDate = getCurrentDate();
    if (currentDate !== lastCheckedDate) {
        lastCheckedDate = currentDate;
        DataStore.set("RPCStatsStartTime", Date.now());
        DataStore.set("RPCStatsNotifications", 0);
    }
}
