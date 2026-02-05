<?php
add_filter("wp_get_attachment_image_attributes", function($attr, $attachment, $size) {
    if (is_singular() && in_the_loop() && !is_admin()) {
        static $first = true;
        if ($first) {
            $attr["loading"] = "eager";
            $attr["fetchpriority"] = "high";
            $attr["decoding"] = "async";
            $first = false;
        }
    }
    return $attr;
}, 20, 3);
