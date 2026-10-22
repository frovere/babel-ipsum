import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  List,
  PopToRootType,
  closeMainWindow,
  environment,
  getFrontmostApplication,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise, useSQL } from "@raycast/utils";
import { join } from "node:path";
import { useState } from "react";
import {
  GeneratedUnit,
  CountInput,
  Unit,
  SourceStory,
  SOURCE_URL,
  selectPreview,
  pasteActionTitle,
  updateCountInput,
  generationQuery,
  parseCountInput,
  validateGenerationRequest,
  orderedActions,
} from "./generator";

const DATABASE_PATH = join(environment.assetsPath, "subterra.sqlite");

async function getPasteTitle(): Promise<string> {
  try {
    const application = await getFrontmostApplication();
    return pasteActionTitle(application.name);
  } catch {
    return pasteActionTitle(undefined);
  }
}

export default function GenerateText({ unit }: { unit: Unit }) {
  const { data: pasteTitle } = usePromise(getPasteTitle);
  const preferences = getPreferenceValues<Preferences>();
  const defaultCount = validateGenerationRequest(
    unit,
    unit === "paragraphs" ? preferences.defaultParagraphCount : preferences.defaultSentenceCount,
  ).count;
  const [count, setCount] = useState<CountInput>(() => ({
    input: "",
    request: parseCountInput(unit, "", defaultCount),
  }));
  // Installed useSQL uses uncached usePromise. The query depends only on the unit,
  // so count edits retain this session’s pool; only Regenerate revalidates it.
  const { data, isLoading, error, revalidate } = useSQL<GeneratedUnit>(DATABASE_PATH, generationQuery(unit), {
    onError: () => undefined,
  });
  const request = count.request;
  let preview: ReturnType<typeof selectPreview> | undefined;
  let message: string | undefined;
  if (!isLoading) {
    if (error)
      message =
        "Source text could not be loaded. Try again. If this continues, reinstall the extension to restore the source text.";
    else {
      try {
        preview = selectPreview(request, data ?? []);
      } catch (error) {
        message = error instanceof Error ? error.message : "Source text could not be generated. Try again.";
      }
    }
  }
  const label = `${request.count} ${request.count === 1 ? unit.slice(0, -1) : unit}`;
  const markdown = [
    ...(count.error ? [`**Invalid count:** ${count.error}`] : []),
    isLoading
      ? "Selecting source text…"
      : preview
        ? escapeMarkdown(preview.text)
        : `# Could not generate text\n\n${message}`,
  ].join("\n\n");

  return (
    <List
      navigationTitle={`Generate Sub Terra ${unit === "paragraphs" ? "Paragraphs" : "Sentences"}`}
      isShowingDetail
      isLoading={isLoading}
      filtering={false}
      throttle={false}
      searchText={count.input}
      onSearchTextChange={(input) => setCount((previous) => updateCountInput(previous, input, defaultCount))}
      searchBarPlaceholder={`Number of ${unit} (default ${defaultCount})`}
      selectedItemId="preview"
    >
      <List.Item
        id="preview"
        title={label}
        subtitle={count.error ? "Invalid count" : undefined}
        detail={<List.Item.Detail markdown={markdown} />}
        actions={
          <ActionPanel>
            {preview && !count.error
              ? orderedActions(preferences.primaryAction).map((action) =>
                  action === "copy" ? (
                    <Action.CopyToClipboard
                      key="copy"
                      title="Copy to Clipboard"
                      content={preview.text}
                      onCopy={() => {
                        void closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
                      }}
                    />
                  ) : (
                    <Action.Paste
                      key="paste"
                      title={pasteTitle ?? "Paste to Active App"}
                      content={preview.text}
                      onPaste={() => {
                        void closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
                      }}
                    />
                  ),
                )
              : null}
            {!isLoading && !count.error ? (
              <Action
                title={message ? "Try Again" : "Regenerate"}
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            ) : null}
            <InformationAction selected={preview?.selected} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!>|~]/g, "\\$&");
}

function InformationAction({ selected = [] }: { selected?: SourceStory[] }) {
  return <Action.Push title="Information" icon={Icon.Info} target={<Information selected={selected} />} />;
}

function storyLinks(story: SourceStory): string {
  return `- **${escapeMarkdown(story.title)}** (${story.edition}) — [Source](${story.source_url}) · [Revision](${story.revision_url})`;
}

function Information({ selected }: { selected: SourceStory[] }) {
  const { data, isLoading, error, revalidate } = useSQL<SourceStory>(
    DATABASE_PATH,
    "SELECT id AS story_id, title, edition, source_url, revision_url FROM stories ORDER BY edition, id",
    { onError: () => undefined },
  );
  const selectedStories = [...new Map(selected.map((story) => [story.story_id, story])).values()];
  const markdown = [
    "# Sub terra",
    "By **Baldomero Lillo**. The collection includes all 13 stories from the 1904 and 1917 editions.",
    "Text is drawn from Wikisource. Orthography has been modernized and transcription errors corrected; this is not a diplomatic transcription of the original editions.",
    "The original work is in the public domain. Transcriptions are credited to Wikisource contributors; the edited corpus is shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).",
    `[Read Sub terra on Wikisource](${SOURCE_URL})`,
    ...(selectedStories.length ? ["## Selected stories", selectedStories.map(storyLinks).join("\n")] : []),
    "## All stories",
    isLoading
      ? "Loading sources…"
      : error || !data?.length
        ? "Sources could not be loaded. Try again."
        : data.map(storyLinks).join("\n"),
  ].join("\n\n");
  return (
    <Detail
      navigationTitle="Information"
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Wikisource" url={SOURCE_URL} />
          {!isLoading && (error || !data?.length) ? <Action title="Try Again" onAction={revalidate} /> : null}
        </ActionPanel>
      }
    />
  );
}
