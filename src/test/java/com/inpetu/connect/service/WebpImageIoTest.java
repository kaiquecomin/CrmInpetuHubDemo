package com.inpetu.connect.service;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;

import static org.junit.jupiter.api.Assertions.assertTrue;

class WebpImageIoTest {
    @Test
    void registersImageIoReaderForWebpUploads() {
        assertTrue(ImageIO.getImageReadersByFormatName("WebP").hasNext());
    }
}
