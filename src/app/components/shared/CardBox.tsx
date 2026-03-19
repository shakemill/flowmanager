"use client";
import { Card } from "@/components/ui/card";

interface MyAppProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}
const CardBox: React.FC<MyAppProps> = ({ children, className, id }) => {
  return (
    <Card id={id} className={`card bg-background shadow-xs ${className}`}>
      {children}
    </Card>
  );

};

export default CardBox;
