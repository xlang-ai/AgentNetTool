declare module "react-xml-viewer" {
  import { ComponentType, ReactNode } from "react";

  interface Theme {
    attributeKeyColor?: string;
    attributeValueColor?: string;
    cdataColor?: string;
    commentColor?: string;
    fontFamily?: string;
    separatorColor?: string;
    tagColor?: string;
    textColor?: string;
  }

  interface XMLViewerProps {
    xml: string;
    indentSize?: number;
    invalidXml?: ReactNode;
    collapsible?: boolean;
    initalCollapsedDepth?: number;
    theme?: Theme;
  }

  const XMLViewer: ComponentType<XMLViewerProps>;
  export default XMLViewer;
}
