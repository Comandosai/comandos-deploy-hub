(function ($) {
    // Мгновенное обновление Цвета бренда
    wp.customize('brand_color', function (value) {
        value.bind(function (newval) {
            document.documentElement.style.setProperty('--primary', newval);
        });
    });

    // Мгновенное обновление Цвета фона
    wp.customize('bg_color', function (value) {
        value.bind(function (newval) {
            document.documentElement.style.setProperty('--white', newval);
            document.body.style.setProperty('background-color', newval, 'important');
        });
    });
})(jQuery);
