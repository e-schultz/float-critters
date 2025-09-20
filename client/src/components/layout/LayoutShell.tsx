import { ReactNode, useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Sun, Moon, Search, MessageCircle, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ChatPanel } from "@/components/zine/ChatPanel";
import { SearchModal } from "@/components/search/SearchModal";
import { BookmarksPanel } from "@/components/bookmarks/BookmarksPanel";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface LayoutShellProps {
  children: ReactNode;
  breadcrumb?: BreadcrumbItem[];
  progress?: number;
}

export function LayoutShell({ children, breadcrumb = [], progress }: LayoutShellProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.className = newTheme;
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <h1 className="text-xl font-bold hover:text-primary transition-colors" data-testid="app-title">
                  Field Guide Zine
                </h1>
              </Link>
              
              {/* Breadcrumb */}
              {breadcrumb.length > 0 && (
                <nav className="hidden sm:flex" data-testid="breadcrumb-nav">
                  <Breadcrumb>
                    <BreadcrumbList>
                      {breadcrumb.map((item, index) => (
                        <BreadcrumbItem key={item.href}>
                          <BreadcrumbLink asChild>
                            <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
                              {item.label}
                            </Link>
                          </BreadcrumbLink>
                          {index < breadcrumb.length - 1 && <BreadcrumbSeparator />}
                        </BreadcrumbItem>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>
                </nav>
              )}
            </div>
            
            {/* Theme Toggle & Actions */}
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                data-testid="theme-toggle"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search"
                data-testid="search-button"
              >
                <Search className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsBookmarksOpen(true)}
                aria-label="Bookmarks"
                data-testid="bookmarks-button"
              >
                <Bookmark className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      {typeof progress === "number" && (
        <div className="w-full bg-secondary h-1" data-testid="progress-bar">
          <div 
            className="bg-primary h-1 transition-all duration-300" 
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} 
          />
        </div>
      )}

      {/* Main Content */}
      <main>{children}</main>

      {/* Floating Chat Toggle */}
      <Button
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl z-50"
        onClick={() => setIsChatOpen(true)}
        aria-label="Open chat assistant"
        data-testid="chat-toggle"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      {/* Chat Panel */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
      {/* Bookmarks Panel */}
      <BookmarksPanel isOpen={isBookmarksOpen} onClose={() => setIsBookmarksOpen(false)} />
    </div>
  );
}
