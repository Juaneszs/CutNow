import { useParams } from "react-router-dom";
import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { auth } from "../firebase";

export default function Cita() {
  const { id } = useParams();
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");


const guardarCita = async () => {
  if (!fecha || !hora) return alert("Completa todos los campos");

  const user = auth.currentUser;

  await addDoc(collection(db, "citas"), {
    barbero: "Próximamente", // luego será dinámico
    fecha,
    hora,
    estado: "pendiente",
    userId: user.uid,
  });

  alert("Cita agendada ");
};


  return (
    <div>
      <h1>Agendar Cita</h1>

      <input type="date" onChange={(e) => setFecha(e.target.value)} />
      <input type="time" onChange={(e) => setHora(e.target.value)} />

      <button onClick={guardarCita}>
        Confirmar
      </button>
    </div>
  );
}