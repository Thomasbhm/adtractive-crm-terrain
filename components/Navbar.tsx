'use client'

interface NavbarProps {
  prenom?: string
  nom?: string
  role?: string
}

// Header top minimaliste — juste le logo.
// La navigation est gérée par BottomNav (injecté séparément).
// Conservé tel quel pour ne pas casser les pages existantes qui reçoivent les props.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Navbar(_props: NavbarProps) {
  return (
    <header className="bg-white px-4 h-14 flex items-center justify-center sticky top-0 z-30 border-b border-line">
      <img
        src="https://media.adtractive-group.fr/wp-content/uploads/2024/04/8c7871c3-48ee-4ea1-a4b2-c592230cda85-removebg-preview.png"
        alt="ADtractive"
        className="h-7 w-auto"
      />
    </header>
  )
}
