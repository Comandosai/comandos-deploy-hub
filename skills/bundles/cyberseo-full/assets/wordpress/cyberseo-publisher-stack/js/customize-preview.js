(function ($) {
    // Функция для инъекции стилей
    function injectStyles(id, css) {
        var $style = $('#' + id);
        if (!$style.length) {
            $style = $('<style id="' + id + '"></style>').appendTo('head');
        }
        $style.text(css);
    }

    function normalizeHex(color) {
        var hex = (color || '').replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        if (hex.length !== 6) {
            return 'c7f560';
        }
        return hex.toLowerCase();
    }

    function hexToRgb(color) {
        var hex = normalizeHex(color);
        return {
            r: parseInt(hex.substr(0, 2), 16) || 0,
            g: parseInt(hex.substr(2, 2), 16) || 0,
            b: parseInt(hex.substr(4, 2), 16) || 0
        };
    }

    function brightness(color) {
        var rgb = hexToRgb(color);
        return ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000;
    }

    function mixHex(left, right, leftPercent) {
        var l = hexToRgb(left);
        var r = hexToRgb(right);
        var rightPercent = 100 - leftPercent;
        function channel(a, b) {
            return Math.round(((a * leftPercent) + (b * rightPercent)) / 100);
        }
        var out = [channel(l.r, r.r), channel(l.g, r.g), channel(l.b, r.b)].map(function (value) {
            var hex = value.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
        return '#' + out;
    }

    function rgbaFromHex(color, alpha) {
        var rgb = hexToRgb(color);
        return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
    }

    // Определение режима (Статья или Список)
    function isArticleMode() {
        var body = $('body');
        // Если это главная или блог — всегда режим списка
        if (body.hasClass('home') || body.hasClass('blog')) return false;

        return window.comandos_is_singular === true ||
            body.hasClass('single') ||
            body.hasClass('singular') ||
            body.hasClass('page') ||
            $('article.single-post').length > 0;
    }

    // Мгновенное обновление Цвета бренда
    wp.customize('brand_color', function (value) {
        value.bind(function (newval) {
            var buttonText = brightness(newval) > 155 ? '#111111' : '#ffffff';
            var css = ':root {' +
                '--primary: ' + newval + ' !important;' +
                '--primary-dark: ' + mixHex(newval, '#0f172a', 70) + ' !important;' +
                '--primary-glow-light: ' + rgbaFromHex(newval, 0.20) + ' !important;' +
                '--primary-glow-medium: ' + rgbaFromHex(newval, 0.30) + ' !important;' +
                '--primary-glow-strong: ' + rgbaFromHex(newval, 0.42) + ' !important;' +
                '--offer-soft-bg: ' + mixHex(newval, '#ffffff', 10) + ' !important;' +
                '--offer-soft-border: ' + mixHex(newval, '#ffffff', 28) + ' !important;' +
                '--offer-soft-accent: ' + mixHex(newval, '#334155', 52) + ' !important;' +
                '--offer-dark-bg: ' + mixHex(newval, '#020617', 12) + ' !important;' +
                '--offer-dark-badge: rgba(255,255,255,0.92) !important;' +
                '--offer-glow-soft: ' + rgbaFromHex(newval, 0.20) + ' !important;' +
                '--offer-glow-strong: ' + rgbaFromHex(newval, 0.38) + ' !important;' +
                '--offer-button-bg: ' + newval + ' !important;' +
                '--offer-button-text: ' + buttonText + ' !important;' +
                '}';
            injectStyles('comandos-preview-brand', css);
        });
    });

    // Мгновенное обновление Цвета фона (Коридора)
    wp.customize('bg_color', function (value) {
        value.bind(function (newval) {
            var isArticle = isArticleMode();

            // Парсинг цвета
            var hex = newval.replace('#', '');
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            var r = parseInt(hex.substr(0, 2), 16) || 255;
            var g = parseInt(hex.substr(2, 2), 16) || 255;
            var b = parseInt(hex.substr(4, 2), 16) || 255;

            var brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            var textColor = (brightness > 128) ? '#000000' : '#ffffff';

            var css = '';
            if (isArticle) {
                // РЕЖИМ СТАТЬИ: Поля — БЕЛЫЕ, Статья — ЦВЕТНАЯ
                css += ':root { --body-bg: #ffffff !important; --post-bg: ' + newval + ' !important; --bg-color: ' + newval + ' !important; --text-color: ' + textColor + ' !important; }';
                css += 'body { background: #ffffff !important; }';
                css += 'article.single-post, article.page, .article-inner { background: ' + newval + ' !important; }';
            } else {
                // РЕЖИМ СПИСКА: Поля — ЦВЕТНЫЕ, Карточки — БЕЛЫЕ
                css += ':root { --body-bg: ' + newval + ' !important; --post-bg: #ffffff !important; --bg-color: ' + newval + ' !important; --text-color: ' + textColor + ' !important; }';
                css += 'body { background: ' + newval + ' !important; }';
                css += 'article.post-card, article.post, .type-post { background: #ffffff !important; }';
            }
            injectStyles('comandos-preview-bg', css);
        });
    });
})(jQuery);
