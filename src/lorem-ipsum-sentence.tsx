import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LocalStorage,
  Keyboard,
  PopToRootType,
  Toast,
  closeMainWindow,
  environment,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise, useSQL } from "@raycast/utils";
import { join } from "node:path";
import { useState } from "react";
import {
  DEFAULT_SETTINGS,
  GeneratedUnit,
  Settings,
  SourceStory,
  SOURCE_URL,
  formatGeneratedText,
  generationQuery,
  restoreSettings,
  validateSettings,
} from "./generator";

const SETTINGS_KEY = "generation-settings";
const DATABASE_PATH = join(environment.assetsPath, "subterra.sqlite");

async function loadSettings(): Promise<Settings> {
  const stored = await LocalStorage.getItem<string>(SETTINGS_KEY);
  if (!stored) return { ...DEFAULT_SETTINGS };
  try {
    return restoreSettings(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(loadSettings, [], { onError: () => undefined });
  if (isLoading) return <Detail isLoading markdown="Loading your settings…" />;
  if (error || !data) {
    return (
      <Detail
        markdown="# Settings could not be loaded\n\nTry again to load your saved choices."
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  }
  return <GenerationForm initialSettings={data} />;
}

function GenerationForm({ initialSettings }: { initialSettings: Settings }) {
  const { push } = useNavigation();
  const [unit, setUnit] = useState(initialSettings.unit);
  const [count, setCount] = useState(String(initialSettings.count));
  const [error, setError] = useState<string>();

  async function generate() {
    let settings: Settings;
    try {
      settings = validateSettings(unit, count);
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Enter a valid count.");
      return;
    }
    try {
      await LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save your choices",
        message: "You can still generate text.",
      });
    }
    push(<Preview settings={settings} />);
  }

  return (
    <Form
      navigationTitle="Generate Text"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate" icon={Icon.Wand} onSubmit={generate} />
          <InformationAction />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="unit"
        title="Unit"
        value={unit}
        onChange={(value) => {
          setUnit(validateSettings(value, 1).unit);
          setError(undefined);
        }}
      >
        <Form.Dropdown.Item value="paragraphs" title="Paragraphs" />
        <Form.Dropdown.Item value="sentences" title="Sentences" />
      </Form.Dropdown>
      <Form.TextField
        id="count"
        title="Count"
        value={count}
        onChange={(value) => {
          setCount(value);
          setError(undefined);
        }}
        error={error}
        info={unit === "sentences" ? "1–20 sentences" : "1–10 paragraphs"}
      />
      <Form.Description text="Spanish source text from Baldomero Lillo’s Sub terra." />
    </Form>
  );
}

function Preview({ settings }: { settings: Settings }) {
  const [generation, setGeneration] = useState(0);
  return (
    <GeneratedPreview key={generation} settings={settings} regenerate={() => setGeneration((value) => value + 1)} />
  );
}

function GeneratedPreview({ settings, regenerate }: { settings: Settings; regenerate: () => void }) {
  const { data, isLoading, error } = useSQL<GeneratedUnit>(DATABASE_PATH, generationQuery(settings), {
    onError: () => undefined,
  });
  let text: string | undefined;
  let message: string | undefined;
  if (!isLoading) {
    if (error)
      message =
        "Source text could not be loaded. Try again. If this continues, reinstall the extension to restore the source text.";
    else {
      try {
        text = formatGeneratedText(settings, data ?? []);
      } catch (error) {
        message = error instanceof Error ? error.message : "Source text could not be generated. Try again.";
      }
    }
  }

  return (
    <Detail
      navigationTitle={`${settings.count} ${settings.unit}`}
      isLoading={isLoading}
      markdown={
        isLoading ? "Selecting source text…" : text ? escapeMarkdown(text) : `# Could not generate text\n\n${message}`
      }
      actions={
        <ActionPanel>
          {text ? (
            <Action.CopyToClipboard
              title="Copy Text"
              content={text}
              onCopy={() => {
                void closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
              }}
            />
          ) : null}
          {text ? (
            <Action.Paste
              title="Paste Text"
              content={text}
              onPaste={() => {
                void closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
              }}
            />
          ) : null}
          {!isLoading ? (
            <Action
              title={message ? "Try Again" : "Regenerate"}
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={regenerate}
            />
          ) : null}
          <InformationAction selected={text ? data : undefined} />
        </ActionPanel>
      }
    />
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
