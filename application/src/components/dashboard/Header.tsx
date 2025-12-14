import { Button } from "@/components/ui/button";
import { AuthUser } from "@/services/authService";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, PanelLeft, PanelLeftClose, Sun, Globe, FileText, Github, Twitter, MessageSquare, Bell, User, Settings, LogOut, Menu } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranding } from "@/contexts/BrandingContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  toggleMobile?: () => void;
}

export const Header = ({
  currentUser,
  onLogout,
  sidebarCollapsed,
  toggleSidebar,
  toggleMobile
}: HeaderProps) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const branding = useBranding();
  const [greeting, setGreeting] = useState<string>("");
  const navigate = useNavigate();

  // Set greeting based on time of day
  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting(t("goodMorning"));
      } else if (hour >= 12 && hour < 18) {
        setGreeting(t("goodAfternoon"));
      } else {
        setGreeting(t("goodEvening"));
      }
    };
    updateGreeting();

  }, [language, t]);

  // Log avatar data for debugging
  useEffect(() => {
    if (currentUser) {

    }
  }, [currentUser]);

  let avatarUrl = '';
  if (currentUser?.avatar) {

    if (currentUser.avatar.startsWith('/upload/profile/')) {
      avatarUrl = currentUser.avatar;
    } else {
      avatarUrl = currentUser.avatar;
    }
    console.log("Final avatar URL:", avatarUrl);
  }

  return (
    <header className="relative bg-background border-b border-border px-3 md:px-6 flex justify-between items-center py-[12px] overflow-hidden">
      {/* Grid Pattern Overlay - Similar to StatusCards */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(${theme === 'dark' ? '#ffffff10' : '#00000010'} 1px, transparent 1px),
                              linear-gradient(90deg, ${theme === 'dark' ? '#ffffff10' : '#00000010'} 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        >
          <div className="w-full h-full backdrop-blur-[1px]"></div>
        </div>
      </div>

      {/* Header Content */}
      <div className="flex items-center gap-2 md:gap-4 z-10 min-w-0">
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" onClick={toggleMobile} className="flex-shrink-0 md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        {/* Desktop sidebar toggle */}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="flex-shrink-0 hidden md:flex">
          {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>

        <div className="flex items-center min-w-0">
          <h1 className="text-sm md:text-lg font-medium truncate">
            <span className="hidden sm:inline">{greeting}, </span>
            {currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
            <span className="hidden sm:inline"> 👋 ✨</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-1 md:space-x-4 z-10 flex-shrink-0">
        <Button variant="outline" size="icon" className="rounded-full w-8 h-8 border-border" onClick={toggleTheme}>
          <span className="sr-only">Toggle theme</span>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full w-8 h-8 border-border">
              <span className="sr-only">{t("language")}</span>
              <Globe className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLanguage("en")} className={language === "en" ? "bg-accent" : ""}>
              {t("english")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage("km")} className={language === "km" ? "bg-accent" : ""}>
              {t("khmer")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage("de")} className={language === "de" ? "bg-accent" : ""}>
              {t("Deutsch")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage("ko")} className={language === "ko" ? "bg-accent" : ""}>
              {t("korean")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage("ja")} className={language === "ja" ? "bg-accent" : ""}>
              {t("japanese")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage("zhcn")} className={language === "zhcn" ? "bg-accent" : ""}>
              {t("simplifiedChinese")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Documentation - hidden on mobile */}
        {branding.showSocialLinks && branding.showHeaderSocialLinks && branding.showDocsLink && branding.docsUrl && (
          <Button
            variant="outline"
            size="icon"
            className="hidden md:flex rounded-full w-8 h-8 border-border"
            onClick={() => window.open(branding.docsUrl, "_blank")}
          >
            <span className="sr-only">{t("documentation")}</span>
            <FileText className="w-4 h-4" />
          </Button>
        )}

        {/* GitHub - hidden on mobile */}
        {branding.showSocialLinks && branding.showHeaderSocialLinks && branding.showGithubLink && branding.githubUrl && (
          <Button
            variant="outline"
            size="icon"
            className="hidden md:flex rounded-full w-8 h-8 border-border"
            onClick={() => window.open(branding.githubUrl, "_blank")}
          >
            <span className="sr-only">GitHub</span>
            <Github className="w-4 h-4" />
          </Button>
        )}

        {/* X (Twitter) - hidden on mobile */}
        {branding.showSocialLinks && branding.showHeaderSocialLinks && branding.showTwitterLink && branding.twitterUrl && (
          <Button
            variant="outline"
            size="icon"
            className="hidden lg:flex rounded-full w-8 h-8 border-border"
            onClick={() => window.open(branding.twitterUrl, "_blank")}
          >
            <span className="sr-only">X (Twitter)</span>
            <Twitter className="w-4 h-4" />
          </Button>
        )}

        {/* Discord - hidden on mobile */}
        {branding.showSocialLinks && branding.showHeaderSocialLinks && branding.showDiscordLink && branding.discordUrl && (
          <Button
            variant="outline"
            size="icon"
            className="hidden lg:flex rounded-full w-8 h-8 border-border"
            onClick={() => window.open(branding.discordUrl, "_blank")}
          >
            <span className="sr-only">Discord</span>
            <MessageSquare className="w-4 h-4" />
          </Button>
        )}

        {/* Notifications */}
        <Button variant="outline" size="icon" className="rounded-full w-8 h-8 border-border">
          <span className="sr-only">{t("notifications")}</span>
          <Bell className="w-4 h-4" />
        </Button>
        
        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-8 w-8 cursor-pointer ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={currentUser?.name || currentUser?.email?.split('@')[0] || 'User'} /> : <AvatarFallback className="bg-primary/20 text-primary">
                  {currentUser?.name?.[0] || currentUser?.email?.[0] || 'U'}
                </AvatarFallback>}
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-3 p-2">
              <Avatar className="h-10 w-10">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={currentUser?.name || currentUser?.email?.split('@')[0] || 'User'} /> : <AvatarFallback className="bg-primary/20 text-primary">
                    {currentUser?.name?.[0] || currentUser?.email?.[0] || 'U'}
                  </AvatarFallback>}
              </Avatar>
              <div className="flex flex-col space-y-1">
                <span className="font-medium">{currentUser?.name || 'User'}</span>
                <span className="text-xs text-muted-foreground truncate">{currentUser?.email}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <User className="mr-2 h-4 w-4" />
              <span>{t("profile")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t("settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-500 focus:text-red-500">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t("logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
