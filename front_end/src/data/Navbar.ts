export const NavbarItems = [
  {
    title: "Home",
    url: "/#home",
  },
  {
    title: "About",
    url: "/#about",
  },
  {
    title: "Features",
    url: "/#features",
  },
  {
    title: "Contact",
    url: "/#contact",
  },
];

export const menuVariants = {
  hidden: {
    x: "100%", // Start off-screen to the right
    opacity: 0,
  },
  visible: {
    x: 0, // Slide into view
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: "100%", // Slide out to the right
    opacity: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
};
