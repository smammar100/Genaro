// Stories import each component's guidelines (docs/<Component>.md) as text.
declare module "*.md?raw" {
  const content: string;
  export default content;
}
