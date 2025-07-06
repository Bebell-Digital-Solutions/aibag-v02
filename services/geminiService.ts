
import { GoogleGenAI, Chat } from "@google/genai";
import { Message, MessageSender } from '../types';
import { MASTER_PROMPT } from '../constants';

let chat: Chat | null = null;

function getChatInstance(): Chat {
    if (!chat) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chat = ai.chats.create({
            model: 'gemini-2.5-flash-preview-04-17',
            config: {
                systemInstruction: MASTER_PROMPT,
            },
        });
    }
    return chat;
}

export function resetChat() {
    chat = null;
}

export async function streamChatResponse(
    history: Message[],
    newMessage: string,
    fileContext: string
): Promise<AsyncGenerator<string, void, unknown>> {
    const chatInstance = getChatInstance();
    const fullMessage = fileContext ? `${fileContext}\n\n---\n\n${newMessage}` : newMessage;

    // Note: The gemini 'chat' object maintains its own history.
    // We only need to send the latest message.
    const responseStream = await chatInstance.sendMessageStream({ message: fullMessage });

    async function* generator(): AsyncGenerator<string, void, unknown> {
        for await (const chunk of responseStream) {
            yield chunk.text;
        }
    }

    return generator();
}
