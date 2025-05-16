import { CardProps } from "@/types/commonTypes";

export const Card = ({ icon, title, description }: CardProps) => {
  return (
    <div className="flex items-start gap-4 rounded-lg shadow-sm dark:shadow-slate-600 mb-3 p-6">
      <div className="text-[#00B8E4] text-3xl">{icon}</div>
      <div>
        <h4 className="font-bold text-lg">{title}</h4>
        <p className="text-sm text-gray-400 mt-2">{description}</p>
      </div>
    </div>
  );
};
