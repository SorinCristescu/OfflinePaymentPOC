require 'xcodeproj'

project_path = 'ios/OfflinePaymentPOC.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'OfflinePaymentPOC' }

# Get the OfflinePaymentPOC group
main_group = project.main_group.find_subpath('OfflinePaymentPOC', false)

# Files to add
files_to_add = [
  'SMVCSecurityModule.swift',
  'SMVCSecurityBridge.m',
  'OfflinePaymentPOC-Bridging-Header.h'
]

puts "Adding Swift files to Xcode project..."

files_to_add.each do |filename|
  # Check if file already exists in project
  existing = main_group.files.find { |f| f.path == filename }
  
  if existing
    puts "  ⚠️  #{filename} already in project, skipping..."
    next
  end
  
  # Add file reference
  file_ref = main_group.new_file("OfflinePaymentPOC/#{filename}")
  
  # Add to compile sources (only .swift and .m files)
  if filename.end_with?('.swift') || filename.end_with?('.m')
    target.source_build_phase.add_file_reference(file_ref)
    puts "  ✅ Added #{filename} to project and build phase"
  else
    puts "  ✅ Added #{filename} to project (header file)"
  end
end

# Configure build settings
puts "\nConfiguring build settings..."

target.build_configurations.each do |config|
  # Set bridging header
  bridging_header = 'OfflinePaymentPOC/OfflinePaymentPOC-Bridging-Header.h'
  config.build_settings['SWIFT_OBJC_BRIDGING_HEADER'] = bridging_header
  puts "  ✅ Set bridging header: #{bridging_header}"
  
  # Set Swift version
  config.build_settings['SWIFT_VERSION'] = '5.0'
  puts "  ✅ Set Swift version: 5.0"
  
  # Enable Swift Optimization Level for Release
  if config.name == 'Release'
    config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] ||= '-O'
  else
    config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] ||= '-Onone'
  end
end

# Save the project
project.save

puts "\n✅ Xcode project updated successfully!"
puts "\nNext steps:"
puts "1. Clean build folder: cd ios && rm -rf build"
puts "2. Run pod install: cd ios && pod install"
puts "3. Build the app: npm run ios"
