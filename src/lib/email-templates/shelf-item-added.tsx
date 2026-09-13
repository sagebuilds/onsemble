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
  adderName?: string;
  roomName?: string;
  title?: string;
  kind?: string;
  note?: string;
  forYou?: boolean;
  roomUrl?: string;
}

const Email = ({
  adderName = "Someone",
  roomName = "your room",
  title = "Something new",
  kind = "item",
  note = "",
  forYou = false,
  roomUrl = "https://onsemble.sagebuilds.com/home",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${adderName} shelved “${title}” in ${roomName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Onsemble</Text>
        <Heading style={heading}>{`${adderName} shelved “${title}”`}</Heading>
        <Text style={text}>
          {forYou
            ? `${adderName} picked this ${kind} especially for you in “${roomName}”.`
            : `${adderName} added this ${kind} to the shared shelf in “${roomName}” for you both.`}
        </Text>
        {note ? <Text style={quote}>“{note}”</Text> : null}
        <Section style={{ margin: "28px 0" }}>
          <Button href={roomUrl} style={button}>
            Open the shelf
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={muted}>You're getting this because you're a member of “{roomName}”.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `${(data['adderName'] as string) || "Someone"} shelved “${
      (data['title'] as string) || "something new"
    }” in ${(data['roomName'] as string) || "your room"}`,
  displayName: "Shelf item added",
  previewData: {
    adderName: "Sage",
    roomName: "The Den",
    title: "Piranesi",
    kind: "book",
    note: "It reminded me of that rainy trip.",
    forYou: true,
    roomUrl: "https://onsemble.sagebuilds.com/home",
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
const quote = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#374151",
  fontStyle: "italic" as const,
  borderLeft: "3px solid #7c3aed",
  paddingLeft: "14px",
  margin: "16px 0",
};
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
