import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Employee } from "@shared/schema";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  employee: Employee | null;
  loading: boolean;
  setEmployee: (employee: Employee | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  employee: null,
  loading: true,
  setEmployee: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      
      if (user) {
        // Fetch employee data from Firestore
        try {
          const employeeDoc = await getDoc(doc(db, "employees", user.uid));
          if (employeeDoc.exists()) {
            setEmployee(employeeDoc.data() as Employee);
          } else {
            setEmployee(null);
          }
        } catch (error) {
          console.error("Error fetching employee data:", error);
          setEmployee(null);
        }
      } else {
        setEmployee(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, employee, loading, setEmployee }}>
      {children}
    </AuthContext.Provider>
  );
}
