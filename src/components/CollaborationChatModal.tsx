import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Building2,
  GraduationCap,
  MessageSquare,
  Lock,
  Archive,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export interface CollaborationChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborationId: string;
  projectId: string;
  projectTitle: string;
  requestingOrgName: string;
  requestingOrgType?: string | undefined;
  targetOrgName: string;
  targetOrgType?: string | undefined;
  currentUser: User | null;
  currentOrgId?: string | null | undefined;
  isProjectCompleted?: boolean | undefined;
}

interface ChatMessage {
  id: string;
  collaboration_id: string;
  project_id: string;
  sender_user_id: string;
  sender_org_id?: string | null;
  message: string;
  created_at: string;
  sender_name?: string;
}

export function CollaborationChatModal({
  isOpen,
  onClose,
  collaborationId,
  projectId,
  projectTitle,
  requestingOrgName,
  targetOrgName,
  currentUser,
  currentOrgId,
  isProjectCompleted = false,
}: CollaborationChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load persistent chat history from Supabase
  const loadMessages = async () => {
    if (!supabase || !collaborationId) return;
    try {
      const { data, error: fetchErr } = await supabase
        .from("collaboration_messages")
        .select(`
          id,
          collaboration_id,
          project_id,
          sender_user_id,
          sender_org_id,
          message,
          created_at
        `)
        .eq("collaboration_id", collaborationId)
        .order("created_at", { ascending: true });

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setMessages(data || []);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load + Realtime subscription with polling fallback
  useEffect(() => {
    if (!isOpen || !collaborationId) return;
    setLoading(true);
    void loadMessages();

    // Set up Realtime channel
    const channel = supabase
      ?.channel(`collab-chat-${collaborationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "collaboration_messages",
          filter: `collaboration_id=eq.${collaborationId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    // Fallback polling interval (every 8s) in case Realtime socket is blocked
    const pollTimer = setInterval(() => {
      void loadMessages();
    }, 8000);

    return () => {
      clearInterval(pollTimer);
      if (channel) {
        void supabase?.removeChannel(channel);
      }
    };
  }, [isOpen, collaborationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send new persistent message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !supabase || !currentUser || isProjectCompleted) return;

    setSending(true);
    setError("");
    const textToSend = inputText.trim();
    setInputText("");

    try {
      const { data, error: insertErr } = await supabase
        .from("collaboration_messages")
        .insert({
          collaboration_id: collaborationId,
          conversation_id: collaborationId,
          project_id: projectId,
          sender_user_id: currentUser.id,
          sender_org_id: currentOrgId || null,
          message: textToSend,
        })
        .select()
        .single();

      if (insertErr) {
        setError(insertErr.message);
        setInputText(textToSend); // restore on error
      } else if (data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send message.");
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Collaboration Chat"
    >
      <div className="flex h-[85vh] max-h-[720px] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground">Collaboration Chat</h3>
                {isProjectCompleted && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    <Archive size={12} /> Project Completed (Read-only)
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                {projectTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
            title="Close chat"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Partner Connection Bar */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Building2 size={14} className="text-primary" />
            <span className="line-clamp-1">{requestingOrgName}</span>
          </div>
          <span className="text-muted-foreground px-2 font-mono">↔</span>
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <GraduationCap size={14} className="text-indigo-500" />
            <span className="line-clamp-1">{targetOrgName}</span>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-background">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground gap-2">
              <RefreshCw size={16} className="animate-spin text-primary" />
              <span>Loading secure persistent history...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="font-bold text-foreground">Collaboration Activated</h4>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                Both organizations can coordinate milestones, share technical deliverables, and communicate persistently.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_user_id === currentUser?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-xs"
                        : "bg-surface border border-border text-foreground rounded-bl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.message}
                    </p>
                  </div>
                  <span className="mt-1 text-[10px] text-muted-foreground px-1">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar or Read-Only Notice */}
        {isProjectCompleted ? (
          <div className="border-t border-border bg-surface p-4 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
              <Lock size={14} /> This project has concluded. Historical chat records are permanently archived for audit and traceability.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="border-t border-border bg-surface p-3 sm:p-4">
            {error && (
              <p className="mb-2 text-xs text-destructive font-medium">{error}</p>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message to collaborating team..."
                disabled={sending}
                className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0"
                title="Send message"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
