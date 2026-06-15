export type InstituteCode = "ics" | "ibe" | "ite";

export type InstituteTheme = {
  code: InstituteCode;
  name: string;
  colors: {
    primary: string;
    primaryHover: string;
    sidebar: string;
    sidebarMuted: string;
    background: string;
    card: string;
    text: string;
    border: string;
    ring: string;
  };
};