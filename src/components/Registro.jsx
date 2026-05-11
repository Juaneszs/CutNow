
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./Registro.css";

function Register() {
  const navigate = useNavigate();
 
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");


  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

 
  const validar = () => {
    if (!nombre || !apellido || !email || !password || !confirmar) {
      return "Completa todos los campos.";
    }
   
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);//validar emai
    if (!emailValido) {
      return "El correo electrónico no es válido.";
    }
    if (password.length < 6) {
      return "La contraseña debe tener al menos 6 caracteres.";
    }
    if (password !== confirmar) {
      return "Las contraseñas no coinciden.";
    }
    return null; // null = sin errores
  };

  const handleRegistro = async () => {
    const mensajeError = validar();
    if (mensajeError) {
      setError(mensajeError);
      return;
    }

    setError("");
    setCargando(true); 

    try {
      const credenciales = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = credenciales.user.uid; 

 
      await setDoc(doc(db, "usuarios", uid), {
        nombre,
        apellido,
        email,
        creadoEn: new Date().toISOString(),
        role: "user",
      });

      alert("¡Cuenta creada exitosamente!"); navigate("/catalogo");

    } catch (err) {
      
      if (err.code === "auth/email-already-in-use") {
        setError("Este correo ya está registrado.");
      } else if (err.code === "auth/invalid-email") {
        setError("El correo no tiene un formato válido.");
      } else {
        setError("Ocurrió un error: " + err.message);
      }
    } finally {
      setCargando(false); 
    }
  };

  return (
    <div className="register-page">
      {}
      <div className="register-left">
        <h1>Regístrate</h1>
        <p>
          Introduce algunos datos y crea una cuenta en CutNow. Comienza a
          programar tus citas de barbería rápidamente y disfruta de beneficios
          exclusivos.
        </p>
      </div>

      {}
      <div className="register-right">
        <div className="register-card">
          <h2>Crea una cuenta</h2>

          {}
          {error && <p className="register-error">{error}</p>}

          <label>Nombre</label>
          <input
            type="text"
            placeholder="Juan"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <label>Apellido</label>
          <input
            type="text"
            placeholder="Pérez"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
          />

          <label>Correo electrónico</label>
          <input
            type="email"
            placeholder="Juanperez@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="register-passwords">
            <div>
              <label>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label>Confirmar contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
            </div>
          </div>

          <button onClick={handleRegistro} disabled={cargando}>
            {cargando ? "Registrando..." : "Registrarse"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;