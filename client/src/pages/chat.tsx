import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/bottom-nav";
import { Send } from "lucide-react";
import type { ChatMessage } from "@shared/schema";
import { format } from "date-fns";

export default function ChatPage() {
  const { employee } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Real-time messages listener
  useEffect(() => {
    if (!employee) return;

    const messagesRef = collection(db, "chats");
    const q = query(
      messagesRef,
      where("senderId", "in", [employee.id, "superadmin"]),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Only include messages between this employee and superadmin
          if (
            (data.senderId === employee.id && data.receiverId === "superadmin") ||
            (data.senderId === "superadmin" && data.receiverId === employee.id)
          ) {
            msgs.push({ id: doc.id, ...data } as ChatMessage);
          }
        });
        setMessages(msgs);
        setLoading(false);

        // Mark messages as read
        snapshot.forEach(async (docSnapshot) => {
          const data = docSnapshot.data();
          if (data.receiverId === employee.id && !data.read) {
            await updateDoc(doc(db, "chats", docSnapshot.id), { read: true });
          }
        });
      },
      (error) => {
        console.error("Chat listener error:", error);
        toast({
          title: "Connection error",
          description: "Failed to load messages",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [employee, toast]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !employee) return;

    setSending(true);
    try {
      const message: Omit<ChatMessage, "id"> = {
        senderId: employee.id,
        senderName: employee.fullName,
        senderRole: "employee",
        receiverId: "superadmin",
        message: newMessage.trim(),
        timestamp: Date.now(),
        read: false,
      };

      await addDoc(collection(db, "chats"), message);
      setNewMessage("");
    } catch (error: any) {
      console.error("Send message error:", error);
      toast({
        title: "Failed to send",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">SA</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-semibold">Superadmin</h1>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="h-16 w-3/4 ml-auto" />
              <Skeleton className="h-16 w-3/4" />
            </>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground">Start a conversation with the Superadmin</p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.senderId === employee?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${message.id}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      isOwnMessage
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    }`}
                  >
                    <p className="text-sm break-words">{message.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {format(message.timestamp, "h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-background">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              data-testid="input-message"
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newMessage.trim() || sending}
              data-testid="button-send"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
