import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  inviterName?: string;
  roomName?: string;
  roomCode?: string;
  joinUrl?: string;
}

const Email = ({
  inviterName = "A friend",
  roomName = "their room",
  roomCode = "",
  joinUrl = "https://onsemble.sagebuilds.com/join",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${inviterName} wants to share a room with you on Onsemble`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Onsemble</Text>
        <Heading style={heading}>{`${inviterName} made you a room: “${roomName}”`}</Heading>
        <Text style={text}>
          Onsemble is a cozy place for people who aren't in the same room. You get video calls,
          movies and shows that stay in sync while you watch together, a shared bookshelf for
          recommending things to each other, and a private photo album.
        </Text>
        <Text style={text}>
          Create your free account and you'll join {inviterName} in “{roomName}” right away.
        </Text>
        <Section style={{ margin: "28px 0" }}>
          <Button href={joinUrl} style={button}>
            Sign up and join
          </Button>
        </Section>
        {roomCode ? <Text style={muted}>Room code: {roomCode}</Text> : null}
        <Hr style={hr} />
        <Text style={muted}>
          If you weren't expecting this invitation, you can simply ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `${(data['inviterName'] as string) || "A friend"} invited you to watch together on Onsemble`,
  displayName: "Room invite (new user)",
  previewData: {
    inviterName: "Sage",
    roomName: "Friday Night Club",
    roomCode: "AB12",
    joinUrl: "https://onsemble.sagebuilds.com/join?code=AB12",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px" };
const brand = {
  fontSize: "13px",
  letterSpacing: "2px",
  textTransform: "uppercase" as const,
  color: "#7c3aed",
  fontWeight: 700,
  margin: "0 0 12px",
};
const heading = { fontSize: "26px", lineHeight: "1.25", color: "#111827", margin: "0 0 12px" };
const text = { fontSize: "16px", lineHeight: "1.6", color: "#374151" };
const muted = { fontSize: "13px", lineHeight: "1.6", color: "#6b7280" };
const button = {
  backgroundColor: "#7c3aed",
  color: "#ffffff",
  borderRadius: "999px",
  padding: "13px 26px",
  fontSize: "15px",
  fontWeight: 700,
  textDecoration: "none",
};
const hr = { borderColor: "#e5e7eb", margin: "28px 0 16px" };
