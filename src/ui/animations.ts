export function fadeIn(element: HTMLElement, duration: number = 200): Promise<void> {
  return new Promise((resolve) => {
    element.style.opacity = "0";
    element.style.display = "block";
    element.style.transition = `opacity ${duration}ms ease-in-out`;

    requestAnimationFrame(() => {
      element.style.opacity = "1";
    });

    setTimeout(resolve, duration);
  });
}

export function fadeOut(element: HTMLElement, duration: number = 200): Promise<void> {
  return new Promise((resolve) => {
    element.style.opacity = "1";
    element.style.transition = `opacity ${duration}ms ease-in-out`;

    requestAnimationFrame(() => {
      element.style.opacity = "0";
    });

    setTimeout(() => {
      element.style.display = "none";
      resolve();
    }, duration);
  });
}

export function slideIn(
  element: HTMLElement,
  direction: "top" | "right" | "bottom" | "left" = "top",
  duration: number = 300
): Promise<void> {
  return new Promise((resolve) => {
    const transforms: Record<typeof direction, string> = {
      top: "translateY(-20px)",
      right: "translateX(20px)",
      bottom: "translateY(20px)",
      left: "translateX(-20px)",
    };

    element.style.opacity = "0";
    element.style.transform = transforms[direction];
    element.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;

    requestAnimationFrame(() => {
      element.style.opacity = "1";
      element.style.transform = "translate(0, 0)";
    });

    setTimeout(resolve, duration);
  });
}
