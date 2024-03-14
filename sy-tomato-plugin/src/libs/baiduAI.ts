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

type ChatRole = "user" | "assistant"
type Chat = { role: ChatRole, content: string, tokens: number }

function getTokens(chats: Chat[]) {
    return chats.reduce((s, i) => {
        return s + i.tokens;
    }, 0);
}

export class BaiduAI {
    private AK: string;
    private SK: string;
    constructor(AK: string, SK: string) {
        this.AK = AK;
        this.SK = SK;
    }
    private async getAccessToken() {
        if (!this.AK || !this.SK) return "";
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
    private async calcTokensErnieBot4(prompt: string, fake = false) {
        if (fake) return prompt.length;
        const accessToken = await this.getAccessToken();
        if (!accessToken) return 0;
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
    async chatCompletionsPro(ctx: ChatContext, userContent: string, shouldSaveAIHistory: boolean) {
        const accessToken = await this.getAccessToken();
        if (!accessToken) return {} as AIResponse;
        const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro?access_token=${accessToken}`;
        const tokens = await this.calcTokensErnieBot4(userContent);
        const playload = {
            system: ctx.system,
            messages: await ctx.get(userContent, tokens),
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
        if (data.usage && shouldSaveAIHistory) ctx.add(userContent, data.result, data.usage);
        return data;
    }
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
            chats.splice(0, 2); // must be delete as a pair
        }
        return chats;
    }
    add(user: string, assistant: string, usage: Usage) {
        this.chats = this.addContent("user", user, usage.prompt_tokens);
        this.chats = this.addContent("assistant", assistant, usage.completion_tokens);
    }
    async get(user: string, tokens: number) {
        return this.addContent("user", user, tokens);
    }
    clear() {
        const t = getTokens(this.chats);
        this.chats = [];
        return t;
    }
}
