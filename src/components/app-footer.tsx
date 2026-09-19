export function AppFooter() {
  return (
    <footer className="border-t border-border/60 px-6 py-4 text-center text-xs text-muted-foreground">
      <img src="/favicon.png" alt="EtsyOps" className="mr-2 inline h-5 w-5 align-middle" />
      Built for{" "}
      <a
        href="https://logicgridlab.com"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary hover:underline"
      >
        logicgridlab.com
      </a>{" "}
      - Etsy seller toolkit
    </footer>
  );
}
