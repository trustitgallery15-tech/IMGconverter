import os
import sys
import webbrowser
from PyQt6.QtCore import Qt, QUrl
from PyQt6.QtWidgets import (
    QApplication,
    QMainWindow,
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QComboBox,
    QListWidget,
    QFileDialog,
    QMessageBox,
    QProgressBar,
    QCheckBox,
    QLineEdit,
    QGroupBox,
)
from PyQt6.QtGui import QDragEnterEvent, QDropEvent, QFont, QDoubleValidator
from PIL import Image

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIC_SUPPORTED = True
except ImportError:
    HEIC_SUPPORTED = False

class DragDropArea(QLabel):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent = parent
        self.setAcceptDrops(True)
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setText("Drag & Drop Images Here\n(or click 'Browse Files' below)")
        self.setFont(QFont("Segoe UI", 11, QFont.Weight.Medium))
        self.setObjectName("DragDropArea")
        self.setStyleSheet("""
            QLabel#DragDropArea {
                border: 2px dashed #44444c;
                border-radius: 12px;
                background-color: #1a1a1e;
                color: #8a8a93;
                padding: 30px;
            }
        """)

    def dragEnterEvent(self, event: QDragEnterEvent):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
            self.setStyleSheet("""
                QLabel#DragDropArea {
                    border: 2px dashed #00f0ff;
                    border-radius: 12px;
                    background-color: #1c262e;
                    color: #00f0ff;
                    padding: 30px;
                }
            """)

    def dragLeaveEvent(self, event):
        self.update_style(has_files=bool(self.parent.files_queue))

    def dropEvent(self, event: QDropEvent):
        files = []
        for url in event.mimeData().urls():
            file_path = url.toLocalFile()
            if os.path.isfile(file_path):
                files.append(file_path)
        if files:
            self.parent.add_files(files)
        self.update_style(has_files=bool(self.parent.files_queue))

    def update_style(self, has_files):
        if has_files:
            self.setStyleSheet("""
                QLabel#DragDropArea {
                    border: 2px dashed #00f0ff;
                    border-radius: 12px;
                    background-color: #16222a;
                    color: #00f0ff;
                    padding: 30px;
                }
            """)
        else:
            self.setStyleSheet("""
                QLabel#DragDropArea {
                    border: 2px dashed #44444c;
                    border-radius: 12px;
                    background-color: #1a1a1e;
                    color: #8a8a93;
                    padding: 30px;
                }
            """)

class ImageConverterApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.files_queue = []
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle("Bulk Image Converter & GEO Tagger")
        self.setMinimumSize(700, 680)
        self.setStyleSheet("""
            QMainWindow {
                background-color: #121214;
            }
            QWidget {
                color: #e1e1e6;
                font-family: 'Segoe UI', sans-serif;
            }
            QLabel {
                font-size: 13px;
            }
            QPushButton {
                background-color: #202024;
                border: 1px solid #323238;
                border-radius: 6px;
                color: #e1e1e6;
                padding: 8px 16px;
                font-size: 13px;
                font-weight: 500;
            }
            QPushButton:hover {
                background-color: #29292e;
                border-color: #44444c;
            }
            QPushButton:pressed {
                background-color: #161618;
            }
            QPushButton#ConvertButton {
                background-color: #00f0ff;
                color: #0d0d0e;
                border: none;
                font-weight: 600;
            }
            QPushButton#ConvertButton:hover {
                background-color: #33f3ff;
            }
            QPushButton#ConvertButton:pressed {
                background-color: #00c2cc;
            }
            QPushButton#ClearButton {
                color: #fc4747;
                border-color: #5c1e1e;
            }
            QPushButton#ClearButton:hover {
                background-color: #361616;
            }
            QComboBox {
                background-color: #1a1a1e;
                border: 1px solid #323238;
                border-radius: 6px;
                padding: 6px 12px;
                min-width: 120px;
            }
            QComboBox:hover {
                border-color: #44444c;
            }
            QComboBox::drop-down {
                border: none;
            }
            QListWidget {
                background-color: #1a1a1e;
                border: 1px solid #202024;
                border-radius: 8px;
                padding: 8px;
                color: #c4c4cc;
            }
            QListWidget::item {
                padding: 6px;
                border-bottom: 1px solid #202024;
            }
            QListWidget::item:selected {
                background-color: #29292e;
                color: #00f0ff;
            }
            QProgressBar {
                border: 1px solid #202024;
                border-radius: 4px;
                background-color: #1a1a1e;
                text-align: center;
                color: #e1e1e6;
                font-weight: bold;
            }
            QProgressBar::chunk {
                background-color: #00f0ff;
                width: 10px;
            }
            QCheckBox {
                spacing: 8px;
                font-weight: 500;
            }
            QCheckBox::indicator {
                width: 16px;
                height: 16px;
                border: 1px solid #323238;
                border-radius: 4px;
                background: #1a1a1e;
            }
            QCheckBox::indicator:checked {
                background: #00f0ff;
                border-color: #00f0ff;
            }
            QLineEdit {
                background-color: #1a1a1e;
                border: 1px solid #323238;
                border-radius: 6px;
                padding: 6px 10px;
                color: #e1e1e6;
            }
            QLineEdit:focus {
                border-color: #00f0ff;
            }
            QGroupBox {
                border: 1px solid #202024;
                border-radius: 8px;
                margin-top: 12px;
                padding-top: 16px;
                font-weight: bold;
                color: #00f0ff;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                subcontrol-position: top left;
                left: 12px;
                padding: 0 4px;
            }
        """)

        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(12)

        # Title block
        title_label = QLabel("BULK IMAGE CONVERTER & GEO TAGGER")
        title_label.setFont(QFont("Segoe UI", 14, QFont.Weight.Bold))
        title_label.setStyleSheet("color: #00f0ff; letter-spacing: 1px;")
        subtitle_label = QLabel("Process multiple images, flatten transparency, customize dimensions, and embed GPS coordinates.")
        subtitle_label.setStyleSheet("color: #8a8a93; margin-bottom: 4px;")
        
        main_layout.addWidget(title_label)
        main_layout.addWidget(subtitle_label)

        # Drag & Drop landing zone
        self.drag_drop_area = DragDropArea(self)
        main_layout.addWidget(self.drag_drop_area)

        # Actions Row below landing zone
        actions_layout = QHBoxLayout()
        self.btn_browse = QPushButton("Browse Files")
        self.btn_browse.clicked.connect(self.browse_files)
        self.btn_clear = QPushButton("Clear Queue")
        self.btn_clear.setObjectName("ClearButton")
        self.btn_clear.clicked.connect(self.clear_queue)
        
        actions_layout.addWidget(self.btn_browse)
        actions_layout.addStretch()
        actions_layout.addWidget(self.btn_clear)
        main_layout.addLayout(actions_layout)

        # Queue List Section
        queue_header_layout = QHBoxLayout()
        queue_label = QLabel("Queued Images:")
        queue_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        self.queue_count_label = QLabel("0 files")
        self.queue_count_label.setStyleSheet("color: #8a8a93;")
        queue_header_layout.addWidget(queue_label)
        queue_header_layout.addStretch()
        queue_header_layout.addWidget(self.queue_count_label)
        main_layout.addLayout(queue_header_layout)

        self.list_queue = QListWidget()
        self.list_queue.setMaximumHeight(150)
        main_layout.addWidget(self.list_queue)

        # GEO Tagging GroupBox
        self.geo_group = QGroupBox("GEO Tagging Metadata")
        geo_layout = QVBoxLayout()
        
        self.check_enable_geo = QCheckBox("Enable GPS GEO Tagging")
        self.check_enable_geo.stateChanged.connect(self.toggle_geo_inputs)
        geo_layout.addWidget(self.check_enable_geo)

        inputs_layout = QHBoxLayout()
        
        lat_v_layout = QVBoxLayout()
        lat_label = QLabel("Latitude:")
        self.edit_lat = QLineEdit()
        self.edit_lat.setPlaceholderText("e.g. 37.774929")
        self.edit_lat.setValidator(QDoubleValidator(-90.0, 90.0, 6, self))
        lat_v_layout.addWidget(lat_label)
        lat_v_layout.addWidget(self.edit_lat)
        
        lon_v_layout = QVBoxLayout()
        lon_label = QLabel("Longitude:")
        self.edit_lon = QLineEdit()
        self.edit_lon.setPlaceholderText("e.g. -122.419418")
        self.edit_lon.setValidator(QDoubleValidator(-180.0, 180.0, 6, self))
        lon_v_layout.addWidget(lon_label)
        lon_v_layout.addWidget(self.edit_lon)

        self.btn_open_picker = QPushButton("Open Map Selector")
        self.btn_open_picker.clicked.connect(self.open_online_map_picker)
        self.btn_open_picker.setFixedHeight(34)
        
        inputs_layout.addLayout(lat_v_layout)
        inputs_layout.addLayout(lon_v_layout)
        inputs_layout.addWidget(self.btn_open_picker, alignment=Qt.AlignmentFlag.AlignBottom)
        
        geo_layout.addLayout(inputs_layout)
        self.geo_group.setLayout(geo_layout)
        main_layout.addWidget(self.geo_group)

        # Set initial status of GEO inputs to disabled
        self.toggle_geo_inputs(Qt.CheckState.Unchecked.value)

        # Bottom Conversion Configuration
        bottom_layout = QHBoxLayout()
        
        format_label = QLabel("Output Format:")
        format_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Medium))
        
        self.combo_format = QComboBox()
        self.combo_format.addItems([
            "JPEG (.jpg)",
            "PNG (.png)",
            "WEBP (.webp)",
            "BMP (.bmp)",
            "TIFF (.tiff)",
            "GIF (.gif)",
            "ICO (.ico)",
            "TGA (.tga)",
            "PDF (.pdf)"
        ])
        
        self.btn_convert = QPushButton("Convert & Inject Metadata")
        self.btn_convert.setObjectName("ConvertButton")
        self.btn_convert.clicked.connect(self.start_conversion)

        bottom_layout.addWidget(format_label)
        bottom_layout.addWidget(self.combo_format)
        bottom_layout.addStretch()
        bottom_layout.addWidget(self.btn_convert)
        main_layout.addLayout(bottom_layout)

        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        main_layout.addWidget(self.progress_bar)

    def toggle_geo_inputs(self, state):
        is_checked = state == Qt.CheckState.Checked.value
        self.edit_lat.setEnabled(is_checked)
        self.edit_lon.setEnabled(is_checked)
        self.btn_open_picker.setEnabled(is_checked)

    def open_online_map_picker(self):
        # Open coordinate picker online using OpenStreetMap
        url = "https://www.openstreetmap.org"
        webbrowser.open(url)

    def browse_files(self):
        supported_extensions = "Images (*.png *.jpg *.jpeg *.webp *.bmp *.tiff *.tif *.gif *.tga *.ico"
        if HEIC_SUPPORTED:
            supported_extensions += " *.heic *.heif"
        supported_extensions += ")"
        
        files, _ = QFileDialog.getOpenFileNames(
            self,
            "Select Images to Convert",
            "",
            f"{supported_extensions};;All Files (*)"
        )
        if files:
            self.add_files(files)

    def add_files(self, files):
        valid_exts = ('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.tif', '.gif', '.tga', '.ico', '.heic', '.heif')
        added_any = False
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in valid_exts:
                if f not in self.files_queue:
                    self.files_queue.append(f)
                    self.list_queue.addItem(os.path.basename(f))
                    added_any = True
        
        self.queue_count_label.setText(f"{len(self.files_queue)} files")
        self.drag_drop_area.update_style(has_files=bool(self.files_queue))

    def clear_queue(self):
        self.files_queue.clear()
        self.list_queue.clear()
        self.queue_count_label.setText("0 files")
        self.drag_drop_area.update_style(has_files=False)
        self.progress_bar.setVisible(False)

    def start_conversion(self):
        if not self.files_queue:
            QMessageBox.warning(self, "No Files", "Please add some files to the conversion queue first.")
            return

        # Fetch coordinates if enabled
        inject_gps = self.check_enable_geo.isChecked()
        lat, lon = None, None
        if inject_gps:
            try:
                lat = float(self.edit_lat.text().strip())
                lon = float(self.edit_lon.text().strip())
                if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
                    raise ValueError("Coordinates out of range.")
            except ValueError:
                QMessageBox.warning(
                    self,
                    "Invalid Coordinates",
                    "Please enter valid decimal coordinates:\nLatitude [-90 to 90]\nLongitude [-180 to 180]"
                )
                return

        # Select Output Directory
        output_dir = QFileDialog.getExistingDirectory(self, "Select Output Directory")
        if not output_dir:
            return

        # Determine target format
        format_text = self.combo_format.currentText()
        target_ext = format_text.split("(")[1].replace(")", "").strip()
        format_name = target_ext.replace(".", "").upper()
        if format_name == "JPG":
            format_name = "JPEG"

        self.progress_bar.setVisible(True)
        self.progress_bar.setMaximum(len(self.files_queue))
        self.progress_bar.setValue(0)

        success_count = 0
        errors = []

        for index, file_path in enumerate(self.files_queue):
            try:
                base_name = os.path.splitext(os.path.basename(file_path))[0]
                output_file_name = f"{base_name}{target_ext}"
                dest_path = os.path.join(output_dir, output_file_name)

                # Open with Pillow
                img = Image.open(file_path)

                # A. Handle transparency flattening for specific formats
                if format_name in ("JPEG", "BMP", "PDF") or target_ext in (".jpg", ".bmp", ".pdf"):
                    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                        rgba_img = img.convert("RGBA")
                        background = Image.new("RGB", rgba_img.size, (255, 255, 255))
                        background.paste(rgba_img, mask=rgba_img.split()[3])
                        img = background
                    elif img.mode != "RGB":
                        img = img.convert("RGB")

                # B. Handle ICO standards
                elif format_name == "ICO" or target_ext == ".ico":
                    size = img.size
                    if size[0] not in (16, 32, 48, 256) or size[1] not in (16, 32, 48, 256):
                        img = img.resize((256, 256), Image.Resampling.LANCZOS)

                # C. Prepare GPS metadata if requested
                exif_data = img.getexif() if hasattr(img, 'getexif') else None
                if inject_gps and exif_data is not None:
                    # Convert lat/lon to standard rational representations
                    def to_dms(val):
                        abs_val = abs(val)
                        d = int(abs_val)
                        m = int((abs_val - d) * 60)
                        s = round((abs_val - d - m/60.0) * 3600.0, 4)
                        return d, m, s

                    lat_d, lat_m, lat_s = to_dms(lat)
                    lon_d, lon_m, lon_s = to_dms(lon)
                    lat_ref = 'N' if lat >= 0 else 'S'
                    lon_ref = 'E' if lon >= 0 else 'W'

                    # GPS tag index mapping under 34853 (0x8825)
                    gps_ifd = {
                        1: lat_ref,
                        2: ((lat_d, 1), (lat_m, 1), (int(lat_s * 100), 100)),
                        3: lon_ref,
                        4: ((lon_d, 1), (lon_m, 1), (int(lon_s * 100), 100)),
                    }
                    # Insert GPS info dictionary directly into EXIF
                    exif_data[34853] = gps_ifd

                # Save the image with EXIF metadata (only formats supporting EXIF metadata)
                save_kwargs = {}
                if format_name in ("JPEG", "PNG", "WEBP", "TIFF") and inject_gps and exif_data:
                    save_kwargs["exif"] = exif_data

                if format_name == "PDF":
                    img.save(dest_path, "PDF", resolution=100.0)
                elif format_name == "ICO":
                    img.save(dest_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])
                else:
                    img.save(dest_path, format=format_name, **save_kwargs)

                success_count += 1
            except Exception as e:
                errors.append(f"{os.path.basename(file_path)}: {str(e)}")

            self.progress_bar.setValue(index + 1)
            QApplication.processEvents()

        self.progress_bar.setVisible(False)
        if success_count == len(self.files_queue):
            meta_status = " with injected GPS data" if inject_gps else ""
            QMessageBox.information(
                self,
                "Success",
                f"Successfully converted all {success_count} images to {format_text}{meta_status}!\nSaved in: {output_dir}"
            )
        else:
            err_msg = "\n".join(errors[:5])
            if len(errors) > 5:
                err_msg += f"\n... and {len(errors) - 5} more."
            QMessageBox.warning(
                self,
                "Completed with Errors",
                f"Converted {success_count} out of {len(self.files_queue)} images successfully.\n\nErrors encountered:\n{err_msg}"
            )

        if success_count > 0:
            self.clear_queue()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = ImageConverterApp()
    window.show()
    sys.exit(app.exec())
