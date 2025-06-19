// source: https://hannadrehman.com/blog/enhancing-your-react-markdown-experience-with-syntax-highlighting

import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Button } from "./ui/button";
import { CopyIcon, CheckIcon } from "lucide-react";
import { useState } from "react";

type MarkdownRendererProps = {
  children: string;
};

export default function MarkdownRenderer({
  children: markdown,
}: MarkdownRendererProps) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const [showCopySuccess, setShowCopySuccess] = useState(false);

          const syntaxHighlighterContent = String(children).replace(/\n$/, "");

          const onCopy = () => {
            navigator.clipboard.writeText(syntaxHighlighterContent).then(() => {
              setShowCopySuccess(true);
              setTimeout(() => setShowCopySuccess(false), 1_000);
            });
          };

          const match = /language-(\w+)/.exec(className || "");

          return !inline && match ? (
            <div className="relative">
              <Button
                className="absolute top-2 right-2 z-10"
                size="icon"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  onCopy();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.stopPropagation();
                    onCopy();
                  }
                }}
              >
                {showCopySuccess ? <CheckIcon color="green" /> : <CopyIcon />}
              </Button>
              <SyntaxHighlighter PreTag="div" language={match[1]} {...props}>
                {syntaxHighlighterContent}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {markdown}
    </Markdown>
  );
}
