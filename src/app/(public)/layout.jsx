export const dynamic = "force-dynamic";

export default function PublicLayout({ children, modal }) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
