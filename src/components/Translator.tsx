import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LanguagesIcon, Loader2, XIcon } from "lucide-react";
import { html } from "pinyin-pro";
import { Listen } from "@/components/Listen.tsx";
import { Speak } from "@/components/Speak.tsx";
import { SupportedLanguage } from "@/models/languages.ts";
import { TranslatorType } from "@/models/translator.ts";

import {
  createTranslator,
  sourceLanguageAtom,
  targetLanguageAtom,
} from "@/services/translation.service.ts";
import { cn } from "@/lib/utils.ts";
import { LanguageSelection } from "@/components/LanguageSelection.tsx";
import { useAtom } from "jotai";
import { generatedFlashcardsHistory } from "@/services/flashcards.service.ts";

export function Translator() {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] =
    useAtom<SupportedLanguage>(sourceLanguageAtom);
  const [targetLang, setTargetLang] =
    useAtom<SupportedLanguage>(targetLanguageAtom);
  const [pinyin, setPinyin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [translator, setTranslator] = useState<TranslatorType | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [cancelListen, setCancelListen] = useState<() => void>(() => () => {});
  const [_, setFlashcards] = useAtom(generatedFlashcardsHistory);

  const translateText = useCallback(
    async ({
      text,
      translatorInput,
    }: {
      text?: string;
      translatorInput?: TranslatorType;
    }) => {
      setIsLoading(true);
      try {
        if (!text && !sourceText) {
          return;
        }

        const translation = await (translatorInput ?? translator)?.translate(
          text ?? sourceText,
        );

        if (targetLang === "zh") {
          const pinyin = html(translation || "Translation failed");
          setPinyin(pinyin);
        }
        setTranslatedText(translation ?? "");
      } catch (error) {
        console.error("Translation failed", error);
        setTranslatedText("Translation failed");
      } finally {
        setIsLoading(false);
      }
    },
    [translator],
  );

  useEffect(() => {
    createTranslator({
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
    }).then(async (translator) => {
      setTranslator(translator);
      await translateText({ translatorInput: translator });
      setFlashcards([]);
    });
  }, [sourceLang, targetLang]);

  const handleSwapLanguages = useCallback(async () => {
    const newSourceLang = targetLang;
    const newTargetLang = sourceLang;
    setSourceLang(newSourceLang);
    setTargetLang(newTargetLang);

    const translation = await translator?.translate(sourceText);
    setTranslatedText(sourceText || "Translation failed");
    setSourceText(translation || "Translation failed");
  }, [sourceLang, targetLang, sourceText, translator]);

  return (
    <>
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center backdrop-blur-sm transition-all",
          isListening ? "opacity-100 z-20 bg-black/5" : "opacity-0 -z-[1]",
        )}
      >
        <div className="flex flex-col items-center gap-12 p-6 rounded-md bg-black/20 min-w-64">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-red-500 border border-red-300 rounded-full duration-1000 animate-ping"></div>
            <p className="text-white font-bold">Listening...</p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsListening(false);
              setCancelListen(() => () => {});
            }}
          >
            Cancel
          </Button>
        </div>
      </div>

      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Language Translator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LanguageSelection
            handleSwapLanguages={handleSwapLanguages}
            sourceLang={sourceLang}
            setSourceLang={setSourceLang}
            targetLang={targetLang}
            setTargetLang={setTargetLang}
          />
          <div>
            <Label htmlFor="sourceText">Enter text</Label>
            <div className="relative">
              {sourceText?.length > 0 && (
                <div className="absolute right-2 bottom-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSourceText("");
                      setTranslatedText("");
                    }}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Textarea
                id="sourceText"
                placeholder="Type your text here..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="min-h-[100px]"
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && e.metaKey) {
                    await translateText({ text: sourceText });
                  }
                }}
              />
            </div>
          </div>
          <div className="relative">
            <Label htmlFor="translatedText">Translation</Label>
            {targetLang !== "zh" ? (
              <Textarea
                id="translatedText"
                placeholder="Translation will appear here..."
                value={translatedText}
                readOnly
                className="min-h-[100px]"
              />
            ) : (
              <div className="text-gray-500 rounded-md border border-input bg-transparent min-h-16 px-3 pt-4 pb-3 text-base shadow-sm ">
                <div dangerouslySetInnerHTML={{ __html: pinyin ?? " " }}></div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="gap-3 flex-col sm:flex-row">
          <Button
            className="w-full"
            onClick={() => translateText({ text: sourceText })}
            disabled={isLoading || !sourceText.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <LanguagesIcon className="mr-2 h-4 w-4" />
                <p>Translate</p>
              </>
            )}
          </Button>

          <div className="grid grid-cols-2 gap-3 w-full sm:contents">
            <Speak translatedText={translatedText} targetLang={targetLang} />

            <Listen
              setSourceText={setSourceText}
              language={sourceLang}
              onListen={(text) => translateText({ text })}
              onLoading={(isLoading) => setIsListening(isLoading)}
              cancelListen={cancelListen}
            />
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
