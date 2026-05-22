import React from "react";
import { NavLink } from "react-router-dom";
import { Users, UserPlus } from "lucide-react";
import { motion } from "motion/react";

interface MembersSubNavProps {
  pendingCount?: number;
}

const tabs = [
  { to: "/persons", label: "Mitglieder", icon: Users, end: true },
  { to: "/persons/requests", label: "Anfragen", icon: UserPlus, end: false },
];

export default function MembersSubNav({ pendingCount }: MembersSubNavProps) {
  return (
    <div className="mb-8 flex">
      <nav className="inline-flex gap-1 bg-surface-elevated rounded-2xl p-1 border border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `relative flex items-center gap-2.5 px-5 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all group ${
                  isActive
                    ? "text-accent"
                    : "text-text-dim hover:text-text hover:bg-surface-elevated/50"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="members-subnav-indicator"
                      className="absolute inset-0 bg-accent-muted/10 rounded-xl border border-border"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10 transition-transform group-hover:scale-110" />
                  <span className="relative z-10">{tab.label}</span>
                  {tab.to === "/persons/requests" &&
                    typeof pendingCount === "number" &&
                    pendingCount > 0 && (
                      <span className="relative z-10 ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-accent text-surface text-[9px] font-black">
                        {pendingCount}
                      </span>
                    )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
