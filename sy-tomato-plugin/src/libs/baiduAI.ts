// https://app.quicktype.io/?l=ts

export interface AIResponse {
    id: string;
    object: string;
    created: number;
    result: string;
    is_truncated: boolean;
    need_clear_history: boolean;
    finish_reason: string;
    usage: Usage;
}

export interface Usage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export class BaiduAI {
    private AK: string;
    private SK: string;
    constructor(AK: string, SK: string) {
        this.AK = AK;
        this.SK = SK;
    }
    async getAccessToken() {
        // https://console.bce.baidu.com/qianfan/overview
        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `grant_type=client_credentials&client_id=${this.AK}&client_secret=${this.SK}`,
        };
        const response = await fetch(
            "https://aip.baidubce.com/oauth/2.0/token",
            options,
        );
        if (!response.ok) {
            throw new Error(`getAccessToken error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.access_token;
    }
}

export interface CalcTokensResponse {
    id: string;
    object: string;
    created: number;
    usage: CalcTokenUsage;
}

export interface CalcTokenUsage {
    prompt_tokens: number;
    total_tokens: number;
}

export async function calcTokensErnieBot4(prompt: string, fake = false) {
    if (fake) return prompt.length;
    const accessToken = await getAccessToken();
    const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/tokenizer/erniebot?access_token=${accessToken}`;
    const playload = {
        prompt,
        model: "ernie-bot-4"
    };
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(playload),
    });
    const data = await response.json() as CalcTokensResponse;
    return data.usage.prompt_tokens;
}

type ChatRole = "user" | "assistant"
type Chat = { role: ChatRole, content: string, tokens: number }

function getTokens(chats: Chat[]) {
    return chats.reduce((s, i) => {
        return s + i.tokens;
    }, 0);
}

export class ChatContext {
    private chats: Chat[];
    private _system: string;
    public get system(): string {
        return this._system;
    }
    public set system(value: string) {
        this._system = value;
    }
    private maxTokens: number;
    constructor(maxTokens: number, system = "") {
        this.system = system;
        this.chats = [];
        this.maxTokens = maxTokens;
    }
    addContent(role: ChatRole, content: string, tokens: number) {
        const chats = [...this.chats, { role, content, tokens }];
        while (getTokens(chats) > this.maxTokens && chats.length > 0) {
            chats.splice(0, 1);
        }
        return chats;
    }
    add(user: string, assistant: string, usage: Usage) {
        this.chats = this.addContent("user", user, usage.prompt_tokens);
        this.chats = this.addContent("assistant", assistant, usage.completion_tokens);
    }
    async get(user: string) {
        const tokens = await calcTokensErnieBot4(user);
        return this.addContent("user", user, tokens);
    }
    clear() {
        const t = getTokens(this.chats);
        this.chats = [];
        return t;
    }
}

export async function chatCompletionsPro(ctx: ChatContext, userContent: string) {
    const accessToken = await getAccessToken();
    const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro?access_token=${accessToken}`;
    const playload = {
        system: ctx.system,
        messages: await ctx.get(userContent),
        disable_search: false,
        enable_citation: false,
    };
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(playload),
    });
    const data = await response.json() as AIResponse;
    if (data.usage) ctx.add(userContent, data.result, data.usage);
    return data;
}

// {
//     "id": "as-ey7wii65wk",
//     "object": "chat.completion",
//     "created": 1708326897,
//     "result": "2024年2月25日上海气温3~4℃，小雨转晴，无持续风向<3级，空气质量优，空气质量指数25。\n\n\n\n近几日天气信息：\n\n* 2024-02-18：小雨，13~21℃，东风<3级，空气质量优。\n\n* 2024-02-19：小雨，8~21℃，东北风3-4级，空气质量良。\n\n* 2024-02-20：小雨，8~10℃，东北风3-4级，空气质量优。\n\n* 2024-02-21：中雨转小雨，4~11℃，无持续风向<3级，空气质量优。\n\n* 2024-02-22：小雨，4~5℃，无持续风向<3级，空气质量优。\n\n* 2024-02-23：小雨，3~8℃，无持续风向<3级，空气质量优。\n\n* 2024-02-24：小雨，3~5℃，无持续风向<3级，空气质量优。\n\n* **2024-02-25：小雨转晴，3~4℃，无持续风向<3级，空气质量优**。",
//     "is_truncated": false,
//     "need_clear_history": false,
//     "finish_reason": "normal",
//     "usage": {
//         "prompt_tokens": 244,
//         "completion_tokens": 301,
//         "total_tokens": 545
//     }
// }