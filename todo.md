# Project TODO

- [x] Use the supplied character image unchanged as the assistant persona.
- [x] Upload and reference the character asset through project storage.
- [x] Build a full-screen responsive landing page with a premium cinematic visual system.
- [x] Add a first-load-only cinematic intro sequence with character entrance and greeting.
- [x] Add subtle idle floating/breathing animation for the character.
- [x] Add speech bubbles positioned near the character for assistant messages.
- [x] Add a responsive chat composer for visitor messages.
- [x] Integrate real LLM-backed assistant responses through the server.
- [x] Add loading, error, and retry states for chat responses.
- [x] Add Vitest coverage for the chat backend contract and persona behavior.
- [x] Verify desktop and mobile layouts with screenshots.
- [x] Run typecheck and tests before delivery.
- [x] Save the final project checkpoint for delivery.
- [x] Remove CSS filters and blend modes so the supplied character image is displayed unchanged.
- [x] Persist the intro-play state so the cinematic entrance runs only on the first visit.
- [x] Add a visible retry action for failed chat responses.
- [x] Persist the intro completion flag across visits with durable browser storage.
- [x] Capture the exact failed chat payload for reliable retry behavior.
- [x] Rename the visible assistant persona to gvone throughout the experience.
- [x] Add reference-inspired living motion around the character circle, including tap/hold activity states.
- [x] Add browser voice playback when gvone responds.
- [x] Add press-and-hold voice input with speech recognition and transcript submission.
- [x] Add voice permissions, unsupported-browser, listening, and speaking states.
- [x] Extend Vitest coverage for voice-related assistant behavior where testable.
- [x] Verify the enhanced animation and responsive voice controls on desktop and mobile.
- [x] Save the enhanced gvone checkpoint for delivery.
- [x] Surface explicit unsupported-browser and microphone-permission-denied voice states near the gvone control.
- [x] Add focused Vitest coverage for the extracted voice interaction state logic.
- [x] Save a new checkpoint after the gvone enhancements are fully validated.
- [x] Add fluid tap and hold gesture states directly to the character image and orbit.
- [x] Move the microphone control inside the character circle for a more natural interaction.
- [x] Make assistant speech playback reliably audible with a user-gesture audio unlock path and visible speaking controls.
- [x] Add a manual replay button for the latest assistant response.
- [x] Add tests for the new audio and gesture state helpers.
- [x] Verify the refined interaction on desktop and mobile.
- [x] Save a fresh refined gvone checkpoint.
- [x] Animate the orbit rings during character tap and hold states.
- [x] Add a focused gesture state helper and Vitest coverage.
- [x] Capture a new mobile screenshot after the latest interaction refinements.
- [x] Save a fresh checkpoint after the final Jarvis-like refinements are verified.
- [x] Select and document the neural voice provider and voice profile. — Deferred by user; browser voice retained.
- [x] Add secure server-side neural speech synthesis for gvone responses. — Deferred by user.
- [x] Add the required provider secret and never expose it to the browser. — Deferred by user; no provider secret retained.
- [x] Add neural audio playback, loading, error, replay, and browser fallback states. — Deferred by user; browser voice and replay retained.
- [x] Add tests for the neural voice contract and response handling. — Deferred by user.
- [x] Verify the neural voice experience and responsive controls. — Deferred by user.
- [x] Save a fresh neural-voice checkpoint. — Deferred by user.
- [x] Configure the ElevenLabs API key securely for gvone. — Deferred by user after credential validation failed.
- [x] Add server-side ElevenLabs synthesis while preserving browser voice fallback. — Deferred by user.
- [x] Add credential validation and tests for the ElevenLabs voice path. — Deferred by user after 401 validation responses.
- [x] Verify neural audio playback and save a fresh checkpoint. — Deferred by user.
- [x] Fit the mobile gvone experience to the viewport height without page scrolling.
- [x] Preserve character visibility, in-circle microphone, greeting, and chat composer on narrow screens.
- [x] Adapt typography, spacing, and card heights for short and tall mobile screens.
- [x] Verify mobile no-scroll behavior and recheck desktop layout.
- [x] Save a fresh mobile-optimized checkpoint.
- [x] Remove the inactive ElevenLabs credential test from the default suite while the provider is skipped.
- [x] Make the message writing box taller and easier to use on desktop and mobile.
- [x] Preserve the no-scroll mobile viewport after enlarging the composer.
- [x] Verify the updated composer on mobile and desktop, then save a checkpoint.
- [x] Make assistant AI messages larger, darker, and easier to read.
- [x] Add a clearer separation between assistant responses and user messages.
- [x] Use the supplied character reference as the gvone visual identity.
- [x] Add a dimensional 3D-style character treatment with depth, lighting, and layered placement.
- [x] Keep the character and chat readable on mobile without scrolling.
- [x] Verify the refreshed presentation and save a checkpoint.
- [x] Build a real interactive 3D gvone character scene rather than a flat image treatment.
- [x] Preserve the supplied blue furry character identity using a layered procedural 3D model and reference texture.
- [x] Add idle breathing, floating, camera/parallax, and tap/hold reactions to the 3D model.
- [x] Improve AI chat message contrast, size, spacing, and user/assistant separation.
- [x] Keep the 3D model and readable chat usable on mobile without scrolling.
- [x] Verify the 3D scene, chat readability, responsive behavior, and tests.
- [x] Save a fresh 3D gvone checkpoint.
- [x] Use the supplied character reference in the 3D scene through a verifiable texture or identity-preserving visual layer.
- [x] Add pointer/touch parallax so the 3D camera or model framing responds to movement.
- [x] Save a new checkpoint after the final 3D gvone changes are verified.
- [x] Add an optional mobile motion-permission flow for shake interaction.
- [x] Make gvone drift with device acceleration inside the circular glass enclosure.
- [x] Add soft boundary collisions, damping, and a visible antigravity reaction.
- [x] Add desktop fallback and reduced-motion-safe behavior.
- [x] Verify mobile and desktop states and add tests for the motion helper.
- [x] Save a fresh antigravity checkpoint.
- [x] Respect prefers-reduced-motion by softening or disabling shake-driven antigravity motion and cues.
- [x] Capture a fresh desktop screenshot and verify the no-motion fallback after the antigravity changes.
- [x] Save a new checkpoint after the final antigravity verification.
- [x] Restore the previous polished supplied-image character presentation.
- [x] Remove the rough procedural 3D character from the visible hero.
- [x] Preserve readable AI chat, voice, and subtle mobile shake feedback.
- [x] Verify the restored desktop/mobile presentation and tests.
- [x] Save a fresh restored-look checkpoint.
- [x] Remove the unnecessary three-dot product menu from the visual experiment.
- [x] Keep the page focused on one greeting, one conversation preview, simple input, and microphone interaction.
- [x] Simplify product-like labels and controls without removing the core visual identity.
- [x] Refine spacing, typography, atmospheric background, character presentation, and micro-interactions.
- [x] Preserve readable AI response bubbles and responsive no-scroll mobile composition.
- [x] Verify the minimal concept experience and save a checkpoint.
- [x] Add a slow, art-directed ambient background drift with subtle light movement.
- [x] Add a custom idle expression state for gvone using restrained visual cues.
- [x] Keep listening, speaking, touch, reduced-motion, and mobile behavior coherent.
- [x] Verify the refined visual states and save a checkpoint.
- [x] Extend the conversation card and message viewing area into the unused lower space.
- [x] Remove the “quietly here” and “press enter to begin” footer labels.
- [x] Preserve readable messages, input usability, and no-scroll mobile behavior.
- [x] Verify desktop/mobile presentation and save a checkpoint.
- [x] Add message-count-driven expanding chat layout state.
- [x] Gradually compress the gvone image area upward as conversation content grows.
- [x] Transition the character area into a compact gvone chat header with consistent styling.
- [x] Preserve readable message history, composer usability, and responsive no-scroll behavior.
- [x] Verify the transition with seeded local conversation states and save a checkpoint.
- [x] Render the full conversation history in expanded chat instead of limiting the visible list to four messages.
- [x] Add a deterministic preview/seed state for validating the compressed-character and compact-header transition.
- [x] Capture expanded-state desktop and mobile previews, then save a new checkpoint.
- [x] Fade and collapse the editorial headline and intro copy as chat expands.
- [x] Keep the message list scrollable while anchoring the composer at the bottom of the chat card.
- [x] Prevent expanded chat content from overlapping or hiding the writing area.
- [x] Verify initial and expanded desktop/mobile states, then save a checkpoint.
- [x] Keep the message writing box fixed and reachable at the bottom of the chat card.
- [x] Reduce the initial chat card size before conversation expansion.
- [x] Make the chat card grow gradually rather than jumping to a large height.
- [x] Animate gvone shrinking smoothly toward the compact chat header as messages accumulate.
- [x] Prevent overlap and verify writing access on desktop and mobile before saving a checkpoint.
- [x] Restore a compact but usable initial chat-card height.
- [x] Make each message-driven chat level visibly taller than the previous level.
- [x] Keep the composer fixed and preserve the mobile no-scroll layout.
- [x] Verify initial and expanded desktop/mobile states, then save a checkpoint.
- [x] Restore clearly visible height growth between each chat level.
- [x] Increase the progressive gvone shrink and movement in sync with chat expansion.
- [x] Verify multiple seeded expansion levels on desktop and mobile, then save a checkpoint.
- [x] Add deterministic preview seeds for chat levels 1 through 4.
- [x] Capture desktop and mobile screenshots for each seeded expansion level.
- [x] Save a new checkpoint after the complete level-by-level verification.
- [x] Keep the compact gvone header and chat-panel top edge anchored in a stable position.
- [x] Bound message growth inside an internal scroll region rather than pushing content above the header limit.
- [x] Keep the composer fixed at the panel bottom while messages scroll above it.
- [x] Verify the bounded panel on desktop and mobile and save a checkpoint.
- [x] Capture fresh desktop level-1 and level-4 screenshots after the final anchored-panel CSS changes.
- [x] Save a new checkpoint after bounded-panel desktop/mobile verification.
- [x] Reconfirm the bounded-panel verification item after the checkpoint is saved.
- [x] Match the empty chat card height to the initial no-message composition.
- [x] Keep post-message expansion disabled until the visitor submits the first message.
- [x] Preserve the anchored header and fixed composer after expansion begins.
- [x] Verify empty and post-message states on desktop/mobile and save a checkpoint.
- [x] Let active chat expand beyond the gvone image area into the available viewport height.
- [x] Keep gvone as a compact top chat header once conversation mode is active.
- [x] Keep the message list scrollable and composer fixed at the bottom of the full-height panel.
- [x] Verify desktop/mobile beyond-image expansion and save a checkpoint.

- [x] Add a top-left hamburger navigation control with saved conversation history.
- [x] Persist chat sessions locally and allow reopening, starting, and deleting conversations.
- [x] Add a top-right three-dot menu with standard chatbot actions.
- [x] Add practical assistant settings for voice, appearance, and conversation behavior.
- [x] Preserve gvone’s cinematic layout and responsive no-scroll behavior with the new chatbot shell.
- [x] Verify history persistence, menu interactions, mobile/desktop layouts, and tests.
- [x] Save a new checkpoint after the chatbot shell is complete.

- [x] Remove the redundant compact gvone header from the expanded conversation panel.
- [x] Preserve the main top-left history and top-right chatbot controls after removing the duplicate header.
- [x] Verify desktop/mobile expanded chat and save a checkpoint.

- [x] Add relevant web-result retrieval for each new user chat turn.
- [x] Show four to five source cards beneath the latest gvone response only.
- [x] Add source actions, favicons/thumbnails, and a compact show-more results treatment.
- [x] Preserve the current chat layout and mobile no-scroll behavior with web results.
- [x] Verify web-result loading, errors, responsive presentation, and tests.
- [x] Save a new checkpoint after web results are complete.

- [x] Return a retryable web-source error state instead of silently swallowing search failures.
- [x] Broaden searches when fewer than four unique sources are found, while never fabricating sources.
- [x] Verify the assistant response contract includes source results and complete the test suite.

- [x] Persist source sets for each assistant reply within saved conversations.
- [x] Add a dedicated Web results button beneath each assistant response.
- [x] Open the selected response’s source list in a focused drawer or panel.
- [x] Verify previous-chat source access, responsive behavior, and tests.
- [x] Save a checkpoint after per-response web-result controls are complete.

- [x] Verify a saved conversation restores its per-response source sets after reopening.
- [x] Verify the dedicated Web results drawer on desktop and mobile.
- [x] Save a final checkpoint after response-level source access is verified.

- [x] Restore the full web-results section beneath the latest gvone response.
- [x] Keep dedicated Web results buttons for earlier assistant replies.
- [x] Blur the background whenever a Web results drawer is open.
- [x] Verify desktop/mobile latest results, source drawer, and background blur.
- [x] Save a checkpoint after the refined web-results behavior is complete.

- [x] Capture final populated latest-results and blurred-drawer states on desktop and mobile.
- [x] Save the final verified latest-results refinement checkpoint.

- [x] Restrict automatic scrolling to the newest assistant reply rather than the web-results section.
- [x] Preserve manual access to the latest website-result cards below the reply.
- [x] Verify desktop/mobile reply-focused scrolling and save a checkpoint.

- [x] Capture final desktop/mobile reply-focused scroll states with website results still manually reachable.
- [x] Save the verified reply-focused auto-scroll checkpoint.

- [x] Optimize the Web results drawer entrance and exit motion for mobile devices.
- [x] Tune the mobile source-drawer backdrop blur and dimming for clarity and performance.
- [x] Verify mobile/desktop drawer presentation and save a checkpoint.

- [x] Add layered drawer entrance motion, staggered source-card reveals, and refined tap feedback.
- [x] Respect reduced-motion preferences for all new source-drawer effects.

- [x] Capture a deterministic populated latest-results state at desktop and mobile sizes.
- [x] Save the final web-results refinement checkpoint after deterministic verification.

- [x] Add an image attachment flow for visual identification in gvone chat.
- [x] Add vision-backed image analysis with clear, grounded assistant responses.
- [x] Add image discovery results relevant to the uploaded image or prompt.
- [x] Build mature visual-chat controls, loading states, and accessible mobile presentation.
- [x] Verify image workflows, error handling, privacy cues, and tests.
- [x] Save a checkpoint after the visual assistant upgrade is complete.

- [x] Add an opt-in prompt-only image discovery mode for visual references without an upload.
- [x] Verify the image attach, identification, discovery, and failure states through focused test coverage and responsive previews.
- [x] Save the fully verified visual assistant upgrade checkpoint.

- [x] Add a Manus-inspired interactive workspace layout while retaining gvone’s distinct visual identity.
- [x] Send relevant saved conversation context to gvone so replies can refer back to earlier discussion.
- [x] Add visible capability controls for chat, web research, image identification, and image discovery.
- [x] Add memory controls that let users view and clear conversation context.
- [x] Verify persistent contextual recall, workspace interactions, mobile responsiveness, and tests.
- [x] Save a checkpoint after the Manus-inspired workspace is complete.

- [x] Remove the separate workspace capability card and restore the prior clean conversation composition.
- [x] Retain memory, research, image identification, and discovery functions through subtle existing controls.
- [x] Verify the restored desktop/mobile balance and save a checkpoint.

- [x] Add a compact task-progress bar for gvone’s working lifecycle.
- [x] Show clear stages for understanding, researching, analyzing, and replying without a separate workspace card.
- [x] Preserve the clean desktop/mobile conversation layout and reduced-motion support.
- [x] Verify progress transitions and save a checkpoint.

- [x] Move task progress directly below the top header as a compact expandable control.
- [x] Reveal the detailed working stages only when the header progress control is tapped.
- [x] Verify desktop/mobile expanded progress behavior and save a checkpoint.

- [x] Add a minimal graph-style Feed Memory control near the top-right chat actions.
- [x] Add a compact paste interface for durable user-provided memory snippets.
- [x] Include enabled fed memory together with relevant saved chat context in gvone replies.
- [x] Let users review, edit, disable, and remove fed memory without cluttering the chat.
- [x] Add focused tests, verify desktop/mobile behavior, and save a checkpoint.

- [x] Add a per-note memory scope: global across chats or active only for the current chat.
- [x] Include only global notes and notes assigned to the active conversation in gvone reply context.
- [x] Add a minimal, clear scope toggle with a readable status for each memory note.
- [x] Test scoped memory selection, verify desktop/mobile layouts, and save a checkpoint.

- [x] Add Projects workspaces for dedicated long-term topics and goals.
- [x] Keep conversations grouped within their selected project and support project switching.
- [x] Add project-specific instructions and include them in gvone reply context.
- [x] Add a project file library with upload, listing, and removal controls.
- [x] Maintain bounded shared project context across chats in the same workspace.
- [x] Build minimal desktop/mobile project navigation and workspace management UI.
- [x] Add focused tests, verify workflows, and save a checkpoint.

- [x] Hide chat-only Feed Memory notes when a different conversation is active.
- [x] Keep chat-only notes out of context for every non-assigned conversation.
- [x] Verify cross-chat isolation with tests and responsive previews, then save a checkpoint.

- [x] Add Projects access inside the top-left hamburger navigation.
- [x] Simplify project navigation into clear chats and projects sections.
- [x] Redesign the Projects workspace into a familiar chat-first layout with project chats prominent.
- [x] Keep instructions and files available as compact secondary controls rather than a confusing primary layout.
- [x] Verify the redesigned project experience on desktop/mobile, run tests, and save a checkpoint.

- [x] Add a direct Add to project action for every saved previous chat.
- [x] Allow moving a saved chat between projects or back to personal chats.

- [x] Make selecting a project enter a dedicated project-only chat view.
- [x] Keep the hamburger drawer limited to high-level navigation instead of mixing project details with chats.
- [x] Show only the selected project’s chat list, with compact project controls available separately.
- [x] Verify desktop/mobile project-entry flow, run tests, and save a checkpoint.

- [x] Review the provided reference and identify why the current Projects flow still feels confusing.
- [x] Reduce Projects to one clear navigation path without duplicate project entry points or competing panels.
- [x] Simplify project management controls so chats remain the primary focus.
- [x] Verify the refined desktop/mobile experience, run tests, and save a checkpoint.

- [x] Remove copy, share, like, and dislike controls from Web Results source cards.
- [x] Keep source titles and direct result links as the primary Web Results interaction.
- [x] Verify the simplified source-card layout, run tests, and save a checkpoint.

- [x] Add a compact Image discovery action beneath gvone replies.
- [x] Open saved visual matches directly from the associated reply, including older responses.
- [x] Verify desktop/mobile reply actions, run tests, and save a checkpoint.

- [x] Add Studios as focused workspaces inside each Project.
- [x] Support Studio titles and working briefs without cluttering the Project Home.
- [x] Surface Studios in the project navigation and provide a focused Studio view.
- [x] Include selected Studio context with project instructions in related new replies.
- [x] Verify desktop/mobile Studio creation and navigation, run tests, and save a checkpoint.

- [x] Add a per-reply Image discovery control beside Replay with clear enabled state.
- [x] Save individual visual references into the active Project with a remove action.
- [x] Add a full-screen visual board to compare saved and current visual references.
- [x] Keep visual reference data persistent and organized inside Project context.
- [x] Add focused tests, verify desktop/mobile workflows, and save a checkpoint.

- [x] Strengthen the task-progress bar with clear work-aware stages, state labels, and live detail.
- [x] Show appropriate activity indicators for research, visual discovery, and reply preparation.
- [x] Keep the compact header state minimal while making the expanded view more informative.
- [x] Verify enhanced task progress alongside visual workflows, run tests, and save a checkpoint.

- [x] Move Studios into the Project sidebar navigation beside Home, Chats, Files, and Settings.
- [x] Remove the floating bottom Studios control from the Project workspace.
- [x] Verify desktop/mobile Project navigation, run tests, and save a checkpoint.

- [x] Show an Image discovery button beside Replay on every gvone reply.
- [x] Provide a clear discovery prompt when a reply has no saved visual matches yet.
- [x] Verify desktop/mobile reply actions, run tests, and save a checkpoint.

- [x] Replace reply-triggered Image discovery chat messages with a dedicated visual request. — Superseded by the user-selected Web results entry point.
- [x] Keep discovery progress concise without making the task bar or reply actions feel cluttered. — Superseded by the user-selected Web results entry point.
- [x] Add a compact completion summary for sources and visual references used. — Superseded by the user-selected Web results entry point.
- [x] Verify the simplified desktop/mobile discovery flow, run tests, and save a checkpoint. — Superseded by the user-selected Web results entry point.

- [x] Add Image discovery directly inside each response’s Web results area.
- [x] Use that response’s saved research query for dedicated visual discovery without posting a chat message.
- [x] Remove the redundant Image discovery action beside Replay and retain concise visual loading feedback.
- [x] Verify the simplified desktop/mobile Web results workflow, run tests, and save a checkpoint.

- [x] Add a persistent threaded-conversation data model linked to its parent reply.
- [x] Preserve the selected reply and earlier branch context when continuing a thread.
- [x] Add a restrained Reply in thread action beneath every gvone response.
- [x] Build a focused thread view with a clear return path to the original conversation.
- [x] Add focused tests, verify desktop/mobile thread flows, and save a checkpoint.

- [x] Group reply branches visibly under their parent conversation and retain the parent response anchor.
- [x] Show how many threads belong to the open conversation.
- [x] Add an accessible thread panel with direct navigation and an obvious active-thread state.
- [x] Keep parent and thread message histories clearly separate so unrelated replies do not appear mixed.
- [x] Add focused tests, verify desktop/mobile thread navigation, and save a checkpoint.
