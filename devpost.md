## Inspiration

Chyron turns live Twitch conversations into on-screen updates. Twitch chat arrives as individual messages, while a broadcast can present a headline that stays visible as the discussion develops. We wanted to connect those two forms: keep the community's words as evidence, identify the current discussion, and give it a place in the video alongside the streamer.

Spoken commentary belongs in that context too. Combining chat and streamer audio allows an update to follow what is being discussed across both, with viewer quotes attributed to their original authors.

## What it does

Streamers sign in with Twitch, connect their channel, and enable chat summaries, voice summaries, or both. Chyron groups supported discussions into headlines and short summaries, updates existing stories as the conversation changes, and presents eligible viewer quotes. A scrolling ticker cycles through recent chat messages independently of headline generation.

The preview combines a camera or shared screen with the chat and chyron layers. Streamers can choose from 36 overlay designs and adjust reporting focus, tone, timing, context, and visibility. The overlay can be added to OBS as a transparent browser source, or the composed preview can be broadcast from desktop Chrome through Chyron's relay to Twitch.

Stories retain their supporting message IDs for source inspection. Twitch moderation events remove chat evidence and dismiss updates that depend on it. Simulation exercises the same coverage pipeline with test conversations.

## How we built it

We used OpenAI Codex throughout development to inspect the repository, implement changes, run checks, examine the interface, and investigate failures. User feedback directed the workflow and visual references. The [Codex development README](README.codex.md) describes that process through specific changes and verification results.

The application uses React, TypeScript, and Vite, with a hosted API on Vercel. Twitch OAuth establishes the broadcaster's identity and permissions. EventSub webhooks deliver chat messages, message deletions, user clears, and channel clears. The server verifies each webhook and saves account-specific state in DynamoDB. AppSync Events notifies the dashboard and overlay when a room revision changes.

AWS Bedrock generates coverage through a structured tool call. GLM 5 and GLM 4.7 Flash are configured for the reasoning and fast paths. The returned stories contain evidence IDs and optional viewer quote IDs, which Chyron validates against the available messages. Six-second audio segments pass through decoding, speech detection, and Gemma 4 E2B transcription before entering the same coverage pipeline.

For browser broadcasting, the browser captures the composed preview and sends WebM video and mixed audio over a secure WebSocket. A separate FFmpeg relay encodes H.264/AAC and sends RTMPS video to Twitch. The server stores the stream key encrypted in a short-lived relay record; the browser receives a token for the relay connection. The [system README](README.md) includes the architecture image, source map, and setup instructions.

## Challenges we ran into

Keeping headlines tied to evidence required coordination between the model contract and application state. A voice-only request exposed a mismatch: the model returned a quote ID even though no viewer quote was eligible. We changed the tool schema to omit quote selection in that condition, aligned the prompt, and verified voice-only and quotes-disabled requests against the real AWS model.

Audio capture and transcription also needed explicit source handling. Silence detection prevents silent segments from entering coverage as speech, while source-generation checks prevent a delayed transcript or model response from appearing after the streamer changes sources.

Broadcasting introduced a separate media path. Browser capture produces a different format from Twitch ingest, and encoding needs a persistent process. We separated the FFmpeg relay from the hosted API and added ticket validation, upload backpressure handling, and clean shutdown behavior.

Product iteration mattered as much as the transport. Early manual publishing and pinning controls added steps to a workflow intended to update automatically. Feedback led us to remove those controls and concentrate the interface on capture, reporting, design, and broadcast delivery.

## Accomplishments that we're proud of

Chyron connects Twitch identity, chat, moderation, generated coverage, and broadcast presentation in one workflow. The system follows developing discussions while preserving the source messages behind a headline and the original text behind a viewer quote.

The development record includes real Twitch messages reaching the hosted app, structured coverage and transcription requests against AWS, and a private Twitch bandwidth test that exercised the browser relay and stopped cleanly. The quote-schema correction was verified with both affected model requests, 87 automated tests, and a production build.

The final interface supports automatic coverage, independent chat and voice sources, a live preview, and multiple broadcast styles. Its implementation and the Codex development account are available in the repository under the MIT license.

## What we learned

The model schema is part of the product's behavior. Restricting quote IDs to eligible evidence and removing unavailable fields makes the request reflect what the application can actually accept. Clear source types also keep streamer speech and viewer attribution distinct.

Verification needs to follow the output being changed. Tests can check evidence rules and session boundaries; browser inspection reveals preview and control states; an ingest test checks the media path. Each answers a different question about the same system.

Working with Codex was most useful when a request named a concrete behavior or supplied a visual reference. The cycle of inspection, implementation, observation, and correction shaped Chyron's automatic workflow and exposed assumptions that needed to change.

## What's next for chyron

Next steps are longer broadcast sessions with multiple chat participants, more varied microphone and shared-tab audio tests, and closer checks of headline readability during actual streaming. We also want to refine coverage timing across quiet conversations and fast chat bursts, using recorded behavior to guide the controls and defaults.

Project: [Chyron](https://chyron-six.vercel.app). Code and setup: [GitHub](https://github.com/victorbash400/chyron). Main Codex development session: `01a19689-0bce-7230-bef6-3d92f7ded81e`.
