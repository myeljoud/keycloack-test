import type { Meta, StoryObj } from "@storybook/react-vite";
import { createKcPageStory } from "../KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login.ftl" });

const meta = {
    title: "login/login.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => <KcPageStory />
};

export const WithInvalidCredentials: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                login: { username: "demo" },
                messagesPerField: {
                    existsError: (...fields: string[]) => fields.includes("username") || fields.includes("password"),
                    getFirstError: () => "Invalid username or password."
                }
            }}
        />
    )
};
