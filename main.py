import os
import json

# Define the base directory where the subject folders are stored
base_dir = "./"  # Change this to the path where your subject folders are stored

# Initialize the final data structure
final_data = {}

# Loop through each subject folder
for subject in os.listdir(base_dir):
    subject_path = os.path.join(base_dir, subject)
    
    # Check if it's a directory
    if os.path.isdir(subject_path):
        final_data[subject] = {}
        
        # Loop through each chapter in the subject folder
        for chapter in os.listdir(subject_path):
            chapter_path = os.path.join(subject_path, chapter)
            
            # Check if it's a directory
            if os.path.isdir(chapter_path):
                final_data[subject][chapter] = {}
                
                # Loop through each topic in the chapter folder
                for topic_file in os.listdir(chapter_path):
                    if topic_file.endswith(".json"):
                        topic = topic_file.replace(".json", "")
                        topic_path = os.path.join(chapter_path, topic_file)
                        
                        # Read the JSON file for the topic
                        with open(topic_path, 'r') as file:
                            topic_data = json.load(file)
                        
                        # Extract questions from the topic data
                        questions = topic_data.get("questions", [])
                        
                        # Add the topic and its questions to the final data structure
                        final_data[subject][chapter][topic] = questions

# Save the final data structure to a single JSON file
output_file = "combined_data.json"
with open(output_file, 'w') as file:
    json.dump(final_data, file, indent=0)

print(f"Combined data saved to {output_file}")




# import requests
# import os
# import json

# subject = "chemistry"

# # URL to fetch the data from
# url = f"https://qapi-xbw7.onrender.com/{subject}"

# # Send a GET request to the URL
# response = requests.get(url)

# # Check if the request was successful
# if response.status_code == 200:
#     # Parse the JSON response
#     data = response.json()
    
#     # Extract the chapters from the response
#     chapters = data.get("chapters", [])
    
#     # Create the base directory for the subject if it doesn't exist
#     subject_dir = subject
#     if not os.path.exists(subject_dir):
#         os.makedirs(subject_dir)
    
#     for chapter in chapters:
#         print(f"Chapter: {chapter}")
        
#         # Create the chapter directory if it doesn't exist
#         chapter_dir = os.path.join(subject_dir, chapter)
#         if not os.path.exists(chapter_dir):
#             os.makedirs(chapter_dir)
        
#         # Fetch the topics for the current chapter
#         response2 = requests.get(f"{url}/{chapter}")
#         if response2.status_code == 200:
#             data2 = response2.json()
#             topics = data2.get("topics", [])
            
#             for topic in topics:
#                 # print(f"  Topic: {topic}")
                
#                 # Fetch the detailed data for the current topic
#                 response3 = requests.get(f"{url}/{chapter}/{topic}")
#                 if response3.status_code == 200:
#                     data3 = response3.json()
                    
#                     # Define the file path for the topic JSON file
#                     topic_file_path = os.path.join(chapter_dir, f"{topic}.json")
                    
#                     # Save the data to the topic.json file
#                     with open(topic_file_path, 'w') as json_file:
#                         json.dump(data3, json_file)
#                         # print(f"    Saved data to {topic_file_path}")
#                 else:
#                     print(f"    Failed to retrieve data for topic {topic}. Status code: {response3.status_code}")
#         else:
#             print(f"Failed to retrieve data for chapter {chapter}. Status code: {response2.status_code}")
# else:
#     print(f"Failed to retrieve data. Status code: {response.status_code}")