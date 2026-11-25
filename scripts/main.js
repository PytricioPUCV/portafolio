(function () {
    const canvas = document.getElementById('star-bg');
    const ctx = canvas.getContext('2d');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Celulares y equipos modestos: menos estrellas, sin sombras y a 30 fps
    const lowPower = window.innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4;
    let width = 0;
    let height = 0;
    let stars = [];
    let comets = [];
    let shootingStars = [];
    let isPageVisible = !document.hidden;
    let cometTimer;
    let shootingTimer;
    let frame = 0;

    function randomBetween(a, b) {
        return a + Math.random() * (b - a);
    }

    function isDarkMode() {
        return document.documentElement.getAttribute('data-theme') !== 'light';
    }

    function r_canvas() {
        const dpr = lowPower ? 1 : Math.min(window.devicePixelRatio || 1, 2);
        // En celular la barra del navegador cambia el alto al hacer scroll:
        // solo se recrean las estrellas si cambia el ancho, para que no salten
        const widthChanged = window.innerWidth !== width;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (widthChanged || stars.length === 0) createStars();
    }

    // Campo de estrellas: titilan y se desplazan levemente con el scroll (parallax)
    function createStars() {
        const count = Math.min(lowPower ? 90 : 260, Math.round((width * height) / 7000));
        stars = [];
        for (let i = 0; i < count; i++) {
            const bright = Math.random() < 0.06;
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: bright ? randomBetween(1.2, 1.8) : randomBetween(0.3, 1.1),
                base: bright ? randomBetween(0.7, 1) : randomBetween(0.15, 0.6),
                speed: randomBetween(0.01, 0.04),
                phase: Math.random() * Math.PI * 2,
                depth: randomBetween(0.02, 0.12),
                bright
            });
        }
    }

    function drawStars() {
        const dark = isDarkMode();
        const color = dark ? '255, 255, 255' : '70, 90, 130';
        const scroll = reducedMotion ? 0 : window.scrollY;
        for (const s of stars) {
            const twinkle = reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(frame * s.speed + s.phase);
            const alpha = s.base * twinkle * (dark ? 1 : 0.5);
            const y = (((s.y - scroll * s.depth) % height) + height) % height;
            ctx.beginPath();
            ctx.arc(s.x, y, s.r, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(${color}, ${alpha})`;
            if (s.bright && dark && !lowPower) {
                ctx.shadowColor = 'rgba(0, 191, 255, 0.8)';
                ctx.shadowBlur = 6;
            }
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    function createComet() {
        const angle = randomBetween(Math.PI / 4, Math.PI / 3);
        const speed = randomBetween(5, 9);
        return {
            x: randomBetween(width * 0.3, width * 1.05),
            y: -20,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            trail: []
        };
    }

    function updateComets() {
        for (const comet of comets) {
            comet.trail.push({ x: comet.x, y: comet.y, alpha: comet.alpha });
            if (comet.trail.length > 40) comet.trail.shift();
            comet.x += comet.vx;
            comet.y += comet.vy;
            comet.alpha *= 0.985;
        }
        comets = comets.filter(c => c.y < height + 100 && c.alpha > 0.05);
    }

    function drawComets() {
        const trailStart = isDarkMode() ? { r: 0, g: 120, b: 255 } : { r: 0, g: 51, b: 102 };
        const trailEnd = { r: 0, g: 191, b: 255 };

        for (const comet of comets) {
            for (let i = 0; i < comet.trail.length; i++) {
                const t = comet.trail[i];
                const ratio = i / comet.trail.length;
                const r = Math.round(trailStart.r + (trailEnd.r - trailStart.r) * ratio);
                const g = Math.round(trailStart.g + (trailEnd.g - trailStart.g) * ratio);
                const b = Math.round(trailStart.b + (trailEnd.b - trailStart.b) * ratio);
                const color = `rgb(${r},${g},${b})`;
                ctx.save();
                ctx.globalAlpha = t.alpha * 0.25 * ratio;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 3, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                if (!lowPower) {
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 8;
                }
                ctx.fill();
                ctx.restore();
            }
            ctx.save();
            ctx.globalAlpha = comet.alpha;
            ctx.beginPath();
            ctx.arc(comet.x, comet.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 16;
            ctx.fill();
            ctx.restore();
        }
    }

    // Estrellas fugaces: trazos finos y rápidos, más sutiles que los cometas
    function createShootingStar() {
        const angle = randomBetween(Math.PI * 0.72, Math.PI * 0.85);
        const speed = randomBetween(14, 20);
        return {
            x: randomBetween(width * 0.2, width),
            y: randomBetween(0, height * 0.5),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            length: randomBetween(90, 170),
            life: 0,
            maxLife: Math.round(randomBetween(28, 42))
        };
    }

    function updateShootingStars() {
        for (const s of shootingStars) {
            s.x += s.vx;
            s.y += s.vy;
            s.life++;
        }
        shootingStars = shootingStars.filter(s => s.life < s.maxLife);
    }

    function drawShootingStars() {
        const color = isDarkMode() ? '255, 255, 255' : '0, 90, 180';
        for (const s of shootingStars) {
            const progress = s.life / s.maxLife;
            const alpha = Math.sin(progress * Math.PI) * 0.9;
            const speed = Math.hypot(s.vx, s.vy);
            const tailX = s.x - (s.vx / speed) * s.length;
            const tailY = s.y - (s.vy / speed) * s.length;
            const gradient = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
            gradient.addColorStop(0, `rgba(${color}, ${alpha})`);
            gradient.addColorStop(1, `rgba(${color}, 0)`);
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(tailX, tailY);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }

    // En modo liviano se dibuja 1 de cada 2 cuadros y la lógica avanza 2 pasos,
    // así la velocidad de cometas y estrellas fugaces no cambia
    const stepsPerFrame = lowPower ? 2 : 1;
    let skipFrame = false;

    function anim() {
        requestAnimationFrame(anim);
        if (lowPower) {
            skipFrame = !skipFrame;
            if (skipFrame) return;
        }
        for (let i = 0; i < stepsPerFrame; i++) {
            frame++;
            updateShootingStars();
            updateComets();
        }
        ctx.clearRect(0, 0, width, height);
        drawStars();
        drawShootingStars();
        drawComets();
    }

    function scheduleComets(delay) {
        cometTimer = setTimeout(() => {
            if (isPageVisible) {
                const n = Math.floor(randomBetween(1, 3));
                for (let i = 0; i < n; i++) {
                    setTimeout(() => comets.push(createComet()), i * 400);
                }
            }
            scheduleComets(randomBetween(3000, 7000));
        }, delay);
    }

    function scheduleShootingStars(delay) {
        shootingTimer = setTimeout(() => {
            if (isPageVisible) shootingStars.push(createShootingStar());
            scheduleShootingStars(randomBetween(2000, 5000));
        }, delay);
    }

    function startEffects() {
        clearTimeout(cometTimer);
        clearTimeout(shootingTimer);
        scheduleComets(1200);
        scheduleShootingStars(2500);
    }

    function handleVisibilityChange() {
        isPageVisible = !document.hidden;
        if (isPageVisible) {
            comets = [];
            shootingStars = [];
            startEffects();
        } else {
            clearTimeout(cometTimer);
            clearTimeout(shootingTimer);
        }
    }

    window.addEventListener('resize', r_canvas);
    r_canvas();

    if (reducedMotion) {
        // Sin animación: solo el cielo estático, redibujado al cambiar de tema
        const drawStatic = () => { ctx.clearRect(0, 0, width, height); drawStars(); };
        drawStatic();
        window.addEventListener('resize', drawStatic);
        document.addEventListener('click', e => {
            if (e.target.closest('#theme-toggle-btn')) setTimeout(drawStatic, 0);
        });
        return;
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    anim();
    startEffects();
})();

const translations = {
    es: {
        name: "Patricio",
        nav_home: "Inicio",
        nav_about: "Sobre mí",
        nav_projects: "Proyectos",
        nav_contact: "Contacto",
        greeting: "Hola, soy",
        title: "Desarrollador full stack",
        hero_desc: "Desarrollo web, back-end con PHP y Python, y automatización de procesos.",
        btn_cv_view: "Ver CV",
        cv_file: "assets/cv/CV-Patricio-Hernandez-Vergara.pdf",
        cv_download_name: "CV Patricio Hernández Vergara.pdf",
        btn_cv_download: "Descargar CV",
        about_title: "Sobre mí",
        about_text: `Soy desarrollador full stack enfocado en el back-end, la automatización de procesos y el web scraping. En Global Reefers, empresa líder en logística de exportación de fruta, hice mi práctica profesional y luego trabajé como desarrollador full stack junior, principalmente con PHP, automatizaciones en Python y web scraping. También trabajo con TypeScript, React y la integración de modelos de inteligencia artificial.<br><br>A los 15 años comencé a estudiar programación de forma autodidacta, partiendo por el desarrollo web. Esto me permitió adquirir habilidades analíticas y de resolución de problemas desde temprano.<br><br>Actualmente curso el último año de Ingeniería en Informática en la PUCV, enfocado en el desarrollo de software a nivel profesional y la aplicación práctica de conocimientos técnicos.`,
        skills_title: "Habilidades",
        stat_exp: "Años programando",
        stat_proj: "Proyectos en este portafolio",
        stat_sat: "Idiomas: español nativo, inglés profesional y francés en aprendizaje",
        projects_title: "Proyectos",
        contact_title: "Contáctame",
        contact_text1: "¿Tienes un proyecto o una oportunidad en mente? Me encantaría saber de ella. Siempre estoy abierto a nuevas oportunidades laborales y colaboraciones.",
        contact_text2: "Contáctame a través de mis redes sociales o escríbeme directamente a <a href='mailto:patricio.elias.hernandez.vergara@gmail.com' class='contact-link-email'>patricio.elias.hernandez.vergara@gmail.com</a>",
        contact_text3: "— Patricio",
        location: "Viña del Mar, Chile",
        contact_email: "patricio.elias.hernandez.vergara@gmail.com",
        project_code: "Código",
        project_demo: "Ver demo",
        footer_dev: "Desarrollado por",
        theme_toggle: "Cambiar tema",
        lang_toggle: "Cambiar idioma",
        project1_title: "Planner Universitario PUCV",
        project1_desc: "Aplicación web para gestionar horarios académicos y evaluaciones de la PUCV, con sincronización en la nube mediante Firebase Firestore. Interfaz responsive para usarla desde cualquier dispositivo.",
        project2_title: "MARC-IA",
        project2_desc: "Asistente virtual basado en tecnología RAG para entregar orientación institucional a estudiantes de la Pontificia Universidad Católica de Valparaíso.",
        project3_title: "Gestión Inmobiliaria",
        project3_desc: "Sistema de gestión de ventas de departamentos. Administra la relación entre la demanda y la variación de precios, simulando condiciones del mercado inmobiliario. Proyecto universitario en equipo.",
        project4_title: "FarmaSalud",
        project4_desc: "Sistema de gestión de farmacias desde una terminal, proyecto desarrollado en C. Permite la administración de clientes, proveedores, sucursales y productos, incluyendo módulos de compras y generación de informes de ventas.",
        project5_title: "Pixel Pointers",
        project5_desc: "Videojuego educativo 2D con perspectiva top-down desarrollado en Godot Engine. Incluye misiones, acertijos y evaluaciones mediante combates de jefes para enseñar conceptos técnicos, programado en GDScript. Proyecto universitario en equipo.",
        project6_title: "Intervee",
        project6_desc: "Plataforma de simulación de entrevistas con un entorno 3D interactivo. Desarrollada con Next.js y Three.js, permite a los usuarios explorar una ciudad virtual y realizar entrevistas evaluadas por inteligencia artificial. Proyecto en equipo.",
        project7_title: "Racing Web",
        project7_desc: "E-commerce inspirado en la cultura automovilística. Desarrollado con Ionic y Angular en el frontend, y Node.js con PostgreSQL en el backend, implementando una arquitectura segura y basada en contenedores. Proyecto en equipo.",
        project8_title: "Pirate Adventures",
        project8_desc: "Videojuego de aventuras en 2D desarrollado en Java utilizando el framework LibGDX. El jugador controla a un personaje que debe recolectar objetos mientras evita obstáculos y penalizaciones.",
        project9_title: "Conversor HTML a PDF",
        project9_desc: "Aplicación de escritorio con interfaz gráfica desarrollada en Python para convertir archivos HTML locales a PDF. Utiliza Playwright para conservar estilos CSS e imágenes, ofreciendo opciones de tamaño y orientación.",
        project10_title: "ACC Server Admin Panel",
        project10_desc: "Panel de administración web y rotador automático de pistas para el servidor dedicado de Assetto Corsa Competizione. Configura sesiones, clima y entry list desde formularios, muestra telemetría en tiempo real y se distribuye como ejecutable listo para usar.",
        project11_title: "Decants del Puerto",
        project11_desc: "Tienda online de decants de perfumes de diseñador y árabes. Catálogo con buscador, carrito persistente y pedidos enviados por WhatsApp, desarrollada con React, TypeScript y Tailwind CSS.",
        project12_title: "Hoy Qué Cocino",
        project12_desc: "Aplicación web mobile-first de meal prep basada en el método del plato. Propone combinaciones de alimentos según la dieta y restricciones del usuario, con una API REST en FastAPI, base de datos PostgreSQL y pruebas automatizadas.",
        project13_title: "FitPlanner",
        project13_desc: "Planificador personal de entrenamiento y nutrición. Incluye rutina semanal, registro de series con temporizador de descanso, menú con calorías y gráficos de progreso de peso y fuerza, todo guardado en el dispositivo.",
        project14_title: "Studify",
        project14_desc: "Proyecto de título. Plataforma de micro-aprendizaje que genera contenido educativo personalizado con IA según el perfil de aprendizaje VARK del estudiante. Usa un RAG estructurado con recuperación determinista en SQL, trazable hasta la página fuente, y valida las respuestas del LLM con Pydantic para detectar citas alucinadas. Desarrollado junto a Vicente Cisternas.",
        project_private: "Repositorio privado",
        projects_more: "Más proyectos",
        projects_show_more: "Mostrar más proyectos",
        projects_show_less: "Mostrar menos proyectos",
        project6_role: "Mi rol: diseño, planificación, informes y definición técnica, con una parte menor de desarrollo.",
        project_personal: "Proyecto personal",
        menu_label: "Menú",
        show_more: "Ver más",
        show_less: "Ver menos",
        project_screenshot: "Captura de",
        nav_experience: "Experiencia",
        exp_title: "Experiencia",
        exp_location_vina: "Viña del Mar",
        exp1_role: "Desarrollador Full Stack Junior",
        exp1_date: "feb. 2026 – mar. 2026",
        exp1_p1: "Construí y mantuve plataformas corporativas con PHP, JavaScript y SQL, apoyando proyectos de TI.",
        exp1_p2: "Desarrollé herramientas de automatización en Python que consolidaban datos usados para contrastar cifras y apoyar decisiones de negocio, ahorrando mucho tiempo.",
        exp1_p3: "Implementé nuevas funcionalidades y apoyé despliegues para mantener la operación en marcha.",
        exp2_role: "Práctica profesional · Ingeniería en Informática",
        exp2_date: "dic. 2025 – feb. 2026",
        exp2_p1: "Desarrollé un scraper en Python que obtenía registros completos de exportaciones (tipo de fruta, toneladas, cajas, kg y más) desde una fuente que limitaba los datos por consulta: ejecutaba tres consultas y las unía por claves validadas, de modo que la base de datos tuviera los registros completos.",
        exp2_p2: "Desarrollé módulos en PHP, con diseño de base de datos y endpoints, para el seguimiento de envíos en tiempo real y los enlaces públicos para compartir. Las posiciones de los buques se estimaban a partir de sus conexiones a antenas móviles cercanas a la costa, y los clientes podían compartir la vista de su envío con sus propios clientes en países como China, Japón, India y Estados Unidos.",
        exp2_p3: "Redacté documentación técnica de procedimientos y desarrollos.",
        exp3_role: "Ingeniería en Informática",
        exp3_date: "mar. 2023 – dic. 2026",
        exp3_p1: "Último año de la carrera. Proyecto de título: Studify, plataforma de micro-aprendizaje adaptativo con IA generativa y RAG.",
        cert_title: "Certificaciones",
    },
    en: {
        name: "Patricio",
        nav_home: "Home",
        nav_about: "About me",
        nav_projects: "Projects",
        nav_contact: "Contact",
        greeting: "Hello, I'm",
        title: "Full-stack developer",
        hero_desc: "Web development, PHP and Python back-end, and process automation.",
        btn_cv_view: "View CV",
        cv_file: "assets/cv/CV-Patricio-Hernandez-Vergara-EN.pdf",
        cv_download_name: "Resume Patricio Hernández Vergara.pdf",
        btn_cv_download: "Download CV",
        about_title: "About me",
        about_text: `I am a full-stack developer focused on back-end development, process automation and web scraping. At Global Reefers, a leading fruit export logistics company, I completed my internship and then worked as a junior full-stack developer, mainly with PHP, Python automation and web scraping. I also work with TypeScript, React and AI model integration.<br><br>I started teaching myself to code at 15, beginning with web development, which helped me build analytical and problem-solving skills early on.<br><br>I am currently in my final year of Computer Science at PUCV, with a focus on professional software development and putting technical knowledge into practice.`,
        skills_title: "Skills",
        stat_exp: "Years coding",
        stat_proj: "Projects in this portfolio",
        stat_sat: "Languages: Spanish (native), English (professional) and French (learning)",
        projects_title: "Projects",
        contact_title: "Contact me",
        contact_text1: "Have a project or a role in mind? I'd love to hear about it. I'm always open to new job opportunities and collaborations.",
        contact_text2: "Reach out on social media or email me directly at <a href='mailto:patricio.elias.hernandez.vergara@gmail.com' class='contact-link-email'>patricio.elias.hernandez.vergara@gmail.com</a>",
        contact_text3: "— Patricio",
        location: "Viña del Mar, Chile",
        contact_email: "patricio.elias.hernandez.vergara@gmail.com",
        project_code: "Code",
        project_demo: "Live demo",
        footer_dev: "Developed by",
        theme_toggle: "Change theme",
        lang_toggle: "Change language",
        project1_title: "PUCV University Planner",
        project1_desc: "Web application for managing academic schedules and evaluations at PUCV, with cloud sync through Firebase Firestore and a responsive interface that works on any device.",
        project2_title: "MARC-IA",
        project2_desc: "RAG-based virtual assistant that provides institutional guidance to students at the Pontificia Universidad Católica de Valparaíso.",
        project3_title: "Real Estate Management",
        project3_desc: "Apartment sales management system that models the relationship between demand and price changes, simulating real estate market conditions. University team project.",
        project4_title: "FarmaSalud",
        project4_desc: "Command-line pharmacy management system written in C. Handles customers, suppliers, branches and products, with purchasing modules and sales report generation.",
        project5_title: "Pixel Pointers",
        project5_desc: "Top-down 2D educational game built with Godot Engine and GDScript. It teaches technical concepts through quests, puzzles and boss fights that serve as assessments. University team project.",
        project6_title: "Intervee",
        project6_desc: "Interview simulation platform with an interactive 3D environment. Developed with Next.js and Three.js, it lets users explore a virtual city and take part in interviews evaluated by artificial intelligence. Team project.",
        project7_title: "Racing Web",
        project7_desc: "E-commerce platform inspired by car culture, built with Ionic and Angular on the front end and Node.js with PostgreSQL on the back end, using a secure, containerized architecture. Team project.",
        project8_title: "Pirate Adventures",
        project8_desc: "2D adventure game built in Java with the LibGDX framework. The player controls a character who must collect items while avoiding obstacles and penalties.",
        project9_title: "HTML to PDF Converter",
        project9_desc: "Python desktop application with a graphical interface that converts local HTML files to PDF. It uses Playwright to preserve CSS styles and images, and offers page size and orientation options.",
        project10_title: "ACC Server Admin Panel",
        project10_desc: "Web administration panel and automatic track rotator for the Assetto Corsa Competizione dedicated server. Configures sessions, weather and entry lists through forms, shows real-time telemetry and ships as a ready-to-use executable.",
        project11_title: "Decants del Puerto",
        project11_desc: "Online store for designer and Arabian perfume decants. Searchable catalog, persistent cart and orders sent via WhatsApp, built with React, TypeScript and Tailwind CSS.",
        project12_title: "Hoy Qué Cocino",
        project12_desc: "Mobile-first meal prep web app based on the plate method. Suggests food combinations according to the user's diet and restrictions, backed by a FastAPI REST API, a PostgreSQL database and automated tests.",
        project13_title: "FitPlanner",
        project13_desc: "Personal training and nutrition planner. Includes a weekly routine, set logging with a rest timer, a meal plan with calorie counts, and weight and strength progress charts, all stored on the device.",
        project14_title: "Studify",
        project14_desc: "Capstone project. Micro-learning platform that uses AI to generate personalized educational content based on each student's VARK learning profile. It uses structured RAG with deterministic SQL retrieval, traceable down to the source page, and validates LLM output with Pydantic to detect hallucinated citations. Developed with Vicente Cisternas.",
        project_private: "Private repository",
        projects_more: "More projects",
        projects_show_more: "Show more projects",
        projects_show_less: "Show fewer projects",
        project6_role: "My role: design, planning, documentation and technical definition, with some development.",
        project_personal: "Personal project",
        menu_label: "Menu",
        show_more: "Show more",
        show_less: "Show less",
        project_screenshot: "Screenshot of",
        nav_experience: "Experience",
        exp_title: "Experience",
        exp_location_vina: "Viña del Mar",
        exp1_role: "Junior Full Stack Developer",
        exp1_date: "Feb 2026 – Mar 2026",
        exp1_p1: "Built and maintained corporate platforms with PHP, JavaScript and SQL, supporting IT projects.",
        exp1_p2: "Developed Python automation tools that consolidated data used to cross-check figures and support business decisions, saving significant time.",
        exp1_p3: "Implemented new features and supported deployments to keep operations running.",
        exp2_role: "Computer Science Intern",
        exp2_date: "Dec 2025 – Feb 2026",
        exp2_p1: "Built a Python scraper that retrieved complete export records (fruit type, tons, boxes, kg and more) from a source that capped how much data each query returned: it ran three queries and merged them by validated key fields, so the database held full records.",
        exp2_p2: "Developed PHP modules, including database design and endpoints, for real-time shipment tracking and public share links. Vessel positions were estimated from ship connections to mobile antennas near the coast, and clients could share a live shipment view with their own customers in countries such as China, Japan, India and the United States.",
        exp2_p3: "Wrote technical documentation for procedures and developments.",
        exp3_role: "Computer Science (Ingeniería en Informática)",
        exp3_date: "Mar 2023 – Dec 2026",
        exp3_p1: "Final year of the degree. Capstone project: Studify, an adaptive micro-learning platform powered by generative AI and RAG.",
        cert_title: "Certifications",
    },
    fr: {
        name: "Patricio",
        nav_home: "Accueil",
        nav_about: "À propos",
        nav_projects: "Projets",
        nav_contact: "Contact",
        greeting: "Bonjour, je suis",
        title: "Développeur full-stack",
        hero_desc: "Développement web, back-end en PHP et Python, et automatisation de processus.",
        btn_cv_view: "Voir le CV",
        cv_file: "assets/cv/CV-Patricio-Hernandez-Vergara-FR.pdf",
        cv_download_name: "CV Patricio Hernández Vergara (FR).pdf",
        btn_cv_download: "Télécharger le CV",
        about_title: "À propos de moi",
        about_text: `Je suis un développeur full-stack spécialisé dans le back-end, l'automatisation de processus et le web scraping. Chez Global Reefers, entreprise leader de la logistique d'exportation de fruits, j'ai effectué mon stage professionnel puis travaillé comme développeur full-stack junior, principalement avec PHP, des automatisations en Python et le web scraping. Je travaille également avec TypeScript, React et l'intégration de modèles d'intelligence artificielle.<br><br>À l'âge de 15 ans, j'ai commencé à apprendre la programmation en autodidacte, en commençant par le développement web. Cela m'a permis d'acquérir très tôt des compétences analytiques et de résolution de problèmes.<br><br>Je suis actuellement en dernière année d'ingénierie informatique à la PUCV, concentré sur le développement professionnel de logiciels et l'application pratique des connaissances techniques.`,
        skills_title: "Compétences",
        stat_exp: "Années de programmation",
        stat_proj: "Projets dans ce portfolio",
        stat_sat: "Langues : espagnol natif, anglais professionnel et français en apprentissage",
        projects_title: "Projets",
        contact_title: "Contactez-moi",
        contact_text1: "Vous avez un projet ou une opportunité en tête ? J'aimerais en entendre parler. Je suis toujours ouvert aux nouvelles opportunités professionnelles et collaborations.",
        contact_text2: "Contactez-moi via mes réseaux sociaux ou écrivez-moi directement à <a href='mailto:patricio.elias.hernandez.vergara@gmail.com' class='contact-link-email'>patricio.elias.hernandez.vergara@gmail.com</a>",
        contact_text3: "— Patricio",
        location: "Viña del Mar, Chili",
        contact_email: "patricio.elias.hernandez.vergara@gmail.com",
        project_code: "Code",
        project_demo: "Voir la démo",
        footer_dev: "Développé par",
        theme_toggle: "Changer de thème",
        lang_toggle: "Changer de langue",
        project1_title: "Planificateur universitaire PUCV",
        project1_desc: "Application web pour gérer les emplois du temps académiques et les évaluations à la PUCV, avec synchronisation dans le cloud via Firebase Firestore. Interface responsive utilisable sur n'importe quel appareil.",
        project2_title: "MARC-IA",
        project2_desc: "Assistant virtuel basé sur la technologie RAG pour fournir une orientation institutionnelle aux étudiants de la Pontificia Universidad Católica de Valparaíso.",
        project3_title: "Gestion Immobilière",
        project3_desc: "Système de gestion des ventes d'appartements. Gère la relation entre la demande et la variation des prix, en simulant les conditions du marché immobilier. Projet universitaire en équipe.",
        project4_title: "FarmaSalud",
        project4_desc: "Système de gestion de pharmacie basé sur terminal (CLI, sans interface graphique) développé en C. Permet l'administration des clients, fournisseurs, succursales et produits, incluant des modules d'achat et la génération de rapports de ventes.",
        project5_title: "Pixel Pointers",
        project5_desc: "Jeu vidéo éducatif 2D en vue de dessus développé sur Godot Engine. Comprend des quêtes, des énigmes et des évaluations via des combats de boss pour enseigner des concepts techniques, programmé en GDScript. Projet universitaire en équipe.",
        project6_title: "Intervee",
        project6_desc: "Plateforme de simulation d'entretiens avec un environnement 3D interactif. Développée avec Next.js et Three.js, elle permet aux utilisateurs d'explorer une ville virtuelle et de passer des entretiens évalués par l'intelligence artificielle. Projet en équipe.",
        project7_title: "Racing Web",
        project7_desc: "Plateforme e-commerce inspirée de la culture automobile. Développée avec Ionic et Angular pour le frontend, et Node.js avec PostgreSQL pour le backend, mettant en œuvre une architecture sécurisée et conteneurisée. Projet en équipe.",
        project8_title: "Pirate Adventures",
        project8_desc: "Jeu vidéo d'aventure 2D développé en Java utilisant le framework LibGDX. Le joueur contrôle un personnage qui doit collecter des objets tout en évitant les obstacles et les pénalités.",
        project9_title: "Convertisseur HTML en PDF",
        project9_desc: "Application de bureau avec interface graphique développée en Python pour convertir des fichiers HTML locaux en PDF. Utilise Playwright pour conserver les styles CSS et les images, offrant des options de taille et d'orientation.",
        project10_title: "ACC Server Admin Panel",
        project10_desc: "Panneau d'administration web et rotateur automatique de circuits pour le serveur dédié d'Assetto Corsa Competizione. Configure les sessions, la météo et la liste des engagés via des formulaires, affiche la télémétrie en temps réel et est distribué sous forme d'exécutable prêt à l'emploi.",
        project11_title: "Decants del Puerto",
        project11_desc: "Boutique en ligne de décants de parfums de créateurs et arabes. Catalogue avec recherche, panier persistant et commandes envoyées via WhatsApp, développée avec React, TypeScript et Tailwind CSS.",
        project12_title: "Hoy Qué Cocino",
        project12_desc: "Application web mobile-first de meal prep basée sur la méthode de l'assiette. Propose des combinaisons d'aliments selon le régime et les restrictions de l'utilisateur, avec une API REST FastAPI, une base de données PostgreSQL et des tests automatisés.",
        project13_title: "FitPlanner",
        project13_desc: "Planificateur personnel d'entraînement et de nutrition. Comprend une routine hebdomadaire, l'enregistrement des séries avec minuteur de repos, un menu avec calories et des graphiques de progression du poids et de la force, le tout enregistré sur l'appareil.",
        project14_title: "Studify",
        project14_desc: "Projet de fin d'études. Plateforme de micro-apprentissage qui génère, grâce à l'IA, du contenu pédagogique personnalisé selon le profil d'apprentissage VARK de chaque étudiant. Repose sur un RAG structuré avec une récupération SQL déterministe, traçable jusqu'à la page source, et valide les réponses du LLM avec Pydantic pour détecter les citations hallucinées. Développé avec Vicente Cisternas.",
        project_private: "Dépôt privé",
        projects_more: "Plus de projets",
        projects_show_more: "Voir plus de projets",
        projects_show_less: "Voir moins de projets",
        project6_role: "Mon rôle : conception, planification, rapports et définition technique, avec une part réduite de développement.",
        project_personal: "Projet personnel",
        menu_label: "Menu",
        show_more: "Voir plus",
        show_less: "Voir moins",
        project_screenshot: "Capture de",
        nav_experience: "Expérience",
        exp_title: "Expérience",
        exp_location_vina: "Viña del Mar",
        exp1_role: "Développeur Full Stack Junior",
        exp1_date: "févr. 2026 – mars 2026",
        exp1_p1: "J'ai construit et maintenu des plateformes d'entreprise avec PHP, JavaScript et SQL, en soutien aux projets informatiques.",
        exp1_p2: "J'ai développé des outils d'automatisation en Python qui consolidaient des données servant à recouper des chiffres et à appuyer des décisions métier, avec un gain de temps important.",
        exp1_p3: "J'ai implémenté de nouvelles fonctionnalités et soutenu les déploiements pour assurer la continuité des opérations.",
        exp2_role: "Stage professionnel · Ingénierie informatique",
        exp2_date: "déc. 2025 – févr. 2026",
        exp2_p1: "J'ai développé un scraper en Python qui récupérait des enregistrements complets d'exportations (type de fruit, tonnes, caisses, kg, etc.) depuis une source limitant les données par requête : il exécutait trois requêtes et les fusionnait via des clés validées, afin que la base de données contienne les enregistrements complets.",
        exp2_p2: "J'ai développé des modules PHP, avec conception de base de données et endpoints, pour le suivi des expéditions en temps réel et les liens de partage publics. Les positions des navires étaient estimées à partir de leurs connexions aux antennes mobiles proches de la côte, et les clients pouvaient partager la vue de leur expédition avec leurs propres clients dans des pays comme la Chine, le Japon, l'Inde et les États-Unis.",
        exp2_p3: "J'ai rédigé la documentation technique des procédures et des développements.",
        exp3_role: "Ingénierie informatique",
        exp3_date: "mars 2023 – déc. 2026",
        exp3_p1: "Dernière année du cursus. Projet de fin d'études : Studify, une plateforme de micro-apprentissage adaptatif basée sur l'IA générative et le RAG.",
        cert_title: "Certifications",
    }
};

function setLanguage(lang) {
    const t = translations[lang] || translations['en'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (!t[key]) return;
        // data-i18n-html: textos propios que incluyen marcado (<br>, enlaces)
        if (el.hasAttribute('data-i18n-html')) el.innerHTML = t[key];
        else el.textContent = t[key];
    });
    document.documentElement.lang = lang;
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.title = t.theme_toggle;
        themeBtn.setAttribute('aria-label', t.theme_toggle);
    }
    const langBtn = document.getElementById('lang-flag-btn');
    if (langBtn) {
        langBtn.title = t.lang_toggle;
        langBtn.setAttribute('aria-label', t.lang_toggle);
    }
    const navToggle = document.getElementById('nav-toggle');
    if (navToggle) navToggle.setAttribute('aria-label', t.menu_label);
    document.querySelectorAll('.project-card').forEach(card => {
        const img = card.querySelector('.project-image img');
        const title = card.querySelector('.project-title');
        if (img && title) img.alt = `${t.project_screenshot} ${title.textContent}`;
    });
    // Cada idioma abre y descarga su propia versión del CV
    document.querySelectorAll('.cv-link').forEach(link => {
        link.href = t.cv_file;
        if (link.hasAttribute('download')) link.setAttribute('download', t.cv_download_name);
    });
    refreshToggles();
}



function initLanguage() {
    const langFlagBtn = document.getElementById('lang-flag-btn');
    const langFlagImg = document.getElementById('lang-flag-img');

    const languages = [
        { code: 'en', flag: 'https://flagcdn.com/w40/us.png', name: 'English' },
        { code: 'es', flag: 'https://flagcdn.com/w40/cl.png', name: 'Español' },
        { code: 'fr', flag: 'https://flagcdn.com/w40/fr.png', name: 'Français' }
    ];

    // Idioma inicial: el elegido antes; si no hay, el del navegador (es*, fr*; el resto, inglés)
    let saved = null;
    try { saved = localStorage.getItem('lang'); } catch (e) {}
    const browserLang = (navigator.language || '').toLowerCase();
    const detected = browserLang.startsWith('es') ? 'es' : browserLang.startsWith('fr') ? 'fr' : 'en';
    const initialCode = languages.some(l => l.code === saved) ? saved : detected;
    let currentLangIndex = languages.findIndex(l => l.code === initialCode);

    if (langFlagBtn && langFlagImg) {
        setLanguage(languages[currentLangIndex].code);
        langFlagImg.src = languages[currentLangIndex].flag;
        langFlagImg.alt = languages[currentLangIndex].name;

        langFlagBtn.addEventListener('click', function () {
            currentLangIndex = (currentLangIndex + 1) % languages.length;
            const newLang = languages[currentLangIndex];

            langFlagImg.src = newLang.flag;
            langFlagImg.alt = newLang.name;
            setLanguage(newLang.code);
            try { localStorage.setItem('lang', newLang.code); } catch (e) {}

            langFlagImg.style.transform = 'scale(1.2)';
            setTimeout(() => {
                langFlagImg.style.transform = 'scale(1)';
            }, 150);
        });
    }
}

function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    // El script inline del <head> ya puso data-theme antes del primer pintado
    let currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        // La barra del navegador sigue al tema elegido, no solo al del sistema (colores de --bg)
        document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
            meta.content = theme === 'light' ? '#f4f6fb' : '#040404';
        });
        if (theme === 'light') {
            themeIcon.innerHTML = `
                <!-- Sol -->
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="5" fill="#555e6b"/>
                    <g stroke="#222831" stroke-width="2">
                        <line x1="12" y1="1" x2="12" y2="4"/>
                        <line x1="12" y1="20" x2="12" y2="23"/>
                        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/>
                        <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
                        <line x1="1" y1="12" x2="4" y2="12"/>
                        <line x1="20" y1="12" x2="23" y2="12"/>
                        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/>
                        <line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
                    </g>
                </svg>
            `;
        } else {
            themeIcon.innerHTML = `
                <!-- Luna -->
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" fill="#b0b0b0"/>
                </svg>
            `;
        }
        currentTheme = theme;
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function () {
            setTheme(currentTheme === 'dark' ? 'light' : 'dark');
            // Solo se guarda una elección explícita; sin ella se sigue la preferencia del sistema
            try { localStorage.setItem('theme', currentTheme); } catch (e) {}
        });
        setTheme(currentTheme);
    }
}

function initMobileMenu() {
    const toggle = document.getElementById('nav-toggle');
    const menu = document.getElementById('nav-menu');
    if (!toggle || !menu) return;

    function setOpen(open) {
        menu.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
    }

    toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));

    // Cerrar al elegir una sección, con Escape, al tocar fuera o al volver a escritorio
    menu.addEventListener('click', e => {
        if (e.target.closest('.nav-link')) setOpen(false);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && menu.classList.contains('open')) {
            setOpen(false);
            toggle.focus();
        }
    });
    document.addEventListener('click', e => {
        if (menu.classList.contains('open') && !e.target.closest('.nav')) setOpen(false);
    });
    window.matchMedia('(min-width: 769px)').addEventListener('change', e => {
        if (e.matches) setOpen(false);
    });
}

// Celular: textos largos plegables ("Ver más") y grupo "More projects" acortado.
// Las clases solo tienen efecto dentro de @media (max-width: 768px); en escritorio todo se ve completo.
// Sin JS no se agrega ninguna clase, así que todo queda visible.
const MORE_PROJECTS_VISIBLE_ON_MOBILE = 3;
const mobileQuery = window.matchMedia('(max-width: 768px)');

function currentTranslations() {
    return translations[document.documentElement.lang] || translations.en;
}

function addToggle(target, collapsedClass, button) {
    if (!target.id) target.id = 'collapsible-' + document.querySelectorAll('[id^="collapsible-"]').length;
    target.classList.add(collapsedClass);
    button.type = 'button';
    button.setAttribute('aria-controls', target.id);
    button.setAttribute('aria-expanded', 'false');
    button.dataset.collapsedClass = collapsedClass;
    target.after(button);
    button.addEventListener('click', () => {
        const expand = target.classList.contains(collapsedClass);
        target.classList.toggle(collapsedClass, !expand);
        button.setAttribute('aria-expanded', String(expand));
        refreshToggles();
        // Al acortar el grupo, volver a su subtítulo: si no, la vista queda muy abajo (salto inmediato, sin animación)
        if (!expand && button.classList.contains('toggle-projects')) {
            const subtitle = document.querySelector('.projects-subtitle') || target;
            const top = subtitle.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top, behavior: 'instant' });
        }
    });
}

function textToggle() {
    const button = document.createElement('button');
    button.className = 'toggle-more';
    button.innerHTML = '<span></span> <i class="fas fa-chevron-down" aria-hidden="true"></i>';
    return button;
}

function initMobileCollapse() {
    document.querySelectorAll('.about-text p, .project-description').forEach(el => {
        el.style.setProperty('--clamp-lines', el.matches('.about-text p') ? 7 : 3);
        addToggle(el, 'is-clamped', textToggle());
    });
    document.querySelectorAll('.timeline-points').forEach(list => {
        if (list.children.length > 1) addToggle(list, 'is-collapsed', textToggle());
    });
    // Solo el grupo secundario se acorta; los destacados siempre quedan visibles
    const moreGrid = document.querySelector('.projects-grid--compact');
    if (moreGrid && moreGrid.children.length > MORE_PROJECTS_VISIBLE_ON_MOBILE) {
        const button = document.createElement('button');
        button.className = 'btn btn-secondary toggle-projects';
        button.innerHTML = '<span data-i18n="projects_show_more"></span> <i class="fas fa-chevron-down" aria-hidden="true"></i>';
        addToggle(moreGrid, 'is-collapsed', button);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(refreshToggles, 150);
    });
    mobileQuery.addEventListener('change', refreshToggles);
}

// Actualiza los textos de los botones y oculta "Ver más" cuando el texto ya cabe completo
function refreshToggles() {
    const t = currentTranslations();
    document.querySelectorAll('[aria-controls][data-collapsed-class]').forEach(button => {
        const target = document.getElementById(button.getAttribute('aria-controls'));
        const expanded = button.getAttribute('aria-expanded') === 'true';
        const label = button.querySelector('span');
        if (button.classList.contains('toggle-projects')) {
            // La clave data-i18n sigue al estado, así setLanguage traduce el texto correcto
            label.dataset.i18n = expanded ? 'projects_show_less' : 'projects_show_more';
            label.textContent = t[label.dataset.i18n];
            return;
        }
        label.textContent = expanded ? t.show_less : t.show_more;
        if (target.classList.contains('is-clamped')) {
            button.hidden = !expanded && target.scrollHeight <= target.clientHeight + 1;
        }
    });
}

// El contador "Proyectos en este portafolio" se calcula desde las tarjetas
function initProjectCount() {
    const counter = document.querySelector('[data-count="projects"]');
    if (counter) counter.textContent = document.querySelectorAll('#projects .project-card').length;
}

document.addEventListener('DOMContentLoaded', function () {
    initMobileCollapse();
    initLanguage();
    initTheme();
    initMobileMenu();
    initProjectCount();
});
