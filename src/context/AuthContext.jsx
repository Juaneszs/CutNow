import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const snap = await getDoc(doc(db, "usuarios", firebaseUser.uid));
          if (snap.exists()) {
            setPerfil({ id: snap.id, ...snap.data() });
          }
        } catch (e) {
          console.error("Error leyendo perfil:", e);
        }
      } else {
        setUser(null);
        setPerfil(null);
      }
      setCargando(false);
    });
    return unsub;
  }, []);

  const isAdmin = perfil?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, perfil, isAdmin, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
