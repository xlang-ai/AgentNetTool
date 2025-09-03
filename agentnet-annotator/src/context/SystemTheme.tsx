import { useState, useEffect } from 'react';

const useSystemTheme = () => {
    const getSystemTheme = () =>
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    const [theme, setTheme] = useState(getSystemTheme());

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleThemeChange = (e: { matches: any; }) => {
            setTheme(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handleThemeChange);

        return () => {
            mediaQuery.removeEventListener('change', handleThemeChange);
        };
    }, []);

    console.log('mytheme:', theme);
    return theme;
};

export default useSystemTheme;
